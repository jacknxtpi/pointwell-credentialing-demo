import { NextRequest, NextResponse } from "next/server";
import db, { maskSsn } from "@/lib/db";
import { Provider, PracticeLocation, Reference, Disclosure } from "@/lib/types";
import { requireAdmin } from "@/lib/auth";
import { PROVIDER_COLUMNS } from "@/lib/providerColumns";

// SSN is deliberately excluded: the admin-facing GET below masks it, and this
// form pre-fills from that same GET, so accepting it here would risk writing
// the masked "***-**-1234" string back over the real value. Admins see the
// real SSN only through the audited reveal on the packet page; providers can
// still correct their own SSN via self-service.
const ADMIN_EDITABLE_COLUMNS = PROVIDER_COLUMNS.filter((c) => c !== "ssn");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;
  const provider = db
    .prepare("SELECT * FROM providers WHERE id = ?")
    .get(id) as Provider | undefined;

  if (!provider) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  const practiceLocations = db
    .prepare("SELECT * FROM provider_practice_locations WHERE provider_id = ? ORDER BY id")
    .all(id) as PracticeLocation[];
  const references = db
    .prepare("SELECT * FROM provider_references WHERE provider_id = ? ORDER BY ref_number")
    .all(id) as Reference[];
  const disclosures = db
    .prepare("SELECT * FROM provider_disclosures WHERE provider_id = ? ORDER BY id")
    .all(id) as Disclosure[];

  return NextResponse.json({
    ...provider,
    ssn: maskSsn(provider.ssn),
    practice_locations: practiceLocations,
    references,
    disclosures,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Only ever touch columns actually present in the request -- a field the
  // form didn't send must leave the existing value alone, not null it out.
  const suppliedColumns = ADMIN_EDITABLE_COLUMNS.filter((c) => body[c] !== undefined);
  const practiceLocations: Array<{
    name_and_address: string;
    frequency?: string;
    tax_id?: string;
    start_date?: string;
  }> | null = Array.isArray(body.practice_locations) ? body.practice_locations : null;
  const references: Array<{
    ref_number: number;
    name_title?: string;
    phone?: string;
    email?: string;
    address?: string;
  }> | null = Array.isArray(body.references) ? body.references : null;
  const disclosures: Array<{
    question_key: string;
    answer?: string;
    explanation?: string;
  }> | null = Array.isArray(body.disclosures) ? body.disclosures : null;

  if (suppliedColumns.length === 0 && !practiceLocations && !references && !disclosures) {
    return NextResponse.json({ error: "Nothing to update was provided." }, { status: 400 });
  }

  for (const required of ["npi", "first_name", "last_name"]) {
    if (suppliedColumns.includes(required) && !String(body[required] ?? "").trim()) {
      return NextResponse.json({ error: `${required} cannot be empty.` }, { status: 400 });
    }
  }

  try {
    db.transaction(() => {
      if (suppliedColumns.length > 0) {
        const setClause = suppliedColumns.map((c) => `${c} = ?`).join(", ");
        const values = suppliedColumns.map((c) => body[c]);
        db.prepare(`UPDATE providers SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(
          ...values,
          id
        );
      }

      if (practiceLocations) {
        db.prepare("DELETE FROM provider_practice_locations WHERE provider_id = ?").run(id);
        const insertLocation = db.prepare(
          `INSERT INTO provider_practice_locations (provider_id, name_and_address, frequency, tax_id, start_date)
           VALUES (?, ?, ?, ?, ?)`
        );
        for (const loc of practiceLocations) {
          if (!loc.name_and_address) continue;
          insertLocation.run(
            id,
            loc.name_and_address,
            loc.frequency ?? null,
            loc.tax_id ?? null,
            loc.start_date ?? null
          );
        }
      }

      if (references) {
        db.prepare("DELETE FROM provider_references WHERE provider_id = ?").run(id);
        const insertReference = db.prepare(
          `INSERT INTO provider_references (provider_id, ref_number, name_title, phone, email, address)
           VALUES (?, ?, ?, ?, ?, ?)`
        );
        for (const ref of references) {
          insertReference.run(
            id,
            ref.ref_number,
            ref.name_title ?? null,
            ref.phone ?? null,
            ref.email ?? null,
            ref.address ?? null
          );
        }
      }

      if (disclosures) {
        const insertDisclosure = db.prepare(
          `INSERT INTO provider_disclosures (provider_id, question_key, answer, explanation)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(provider_id, question_key) DO UPDATE SET answer = excluded.answer, explanation = excluded.explanation`
        );
        for (const d of disclosures) {
          if (!d.question_key) continue;
          insertDisclosure.run(id, d.question_key, d.answer ?? null, d.explanation ?? null);
        }
      }
    })();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update provider.";
    const isDuplicate = message.includes("UNIQUE");
    return NextResponse.json(
      { error: isDuplicate ? "A provider with this NPI already exists." : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  const updated = db.prepare("SELECT * FROM providers WHERE id = ?").get(id) as Provider;
  return NextResponse.json({ ...updated, ssn: maskSsn(updated.ssn) });
}
