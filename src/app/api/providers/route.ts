import { NextRequest, NextResponse } from "next/server";
import db, { maskSsn } from "@/lib/db";
import { Provider } from "@/lib/types";
import { PROVIDER_COLUMNS } from "@/lib/providerColumns";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const rows = db
    .prepare("SELECT * FROM providers ORDER BY last_name, first_name")
    .all() as Provider[];
  const masked = rows.map((p) => ({ ...p, ssn: maskSsn(p.ssn) }));
  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();

  if (!body.npi || !body.first_name || !body.last_name) {
    return NextResponse.json(
      { error: "npi, first_name, and last_name are required." },
      { status: 400 }
    );
  }

  const values = PROVIDER_COLUMNS.map((c) => body[c] ?? null);

  const practiceLocations: Array<{
    name_and_address: string;
    frequency?: string;
    tax_id?: string;
    start_date?: string;
  }> = Array.isArray(body.practice_locations) ? body.practice_locations : [];

  const references: Array<{
    ref_number: number;
    name_title?: string;
    phone?: string;
    email?: string;
    address?: string;
  }> = Array.isArray(body.references) ? body.references : [];

  const disclosures: Array<{
    question_key: string;
    answer?: string;
    explanation?: string;
  }> = Array.isArray(body.disclosures) ? body.disclosures : [];

  try {
    const providerId = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO providers (${PROVIDER_COLUMNS.join(", ")}) VALUES (${PROVIDER_COLUMNS.map(() => "?").join(", ")})`
        )
        .run(...values);
      const newId = info.lastInsertRowid as number;

      const insertLocation = db.prepare(
        `INSERT INTO provider_practice_locations (provider_id, name_and_address, frequency, tax_id, start_date)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const loc of practiceLocations) {
        if (!loc.name_and_address) continue;
        insertLocation.run(
          newId,
          loc.name_and_address,
          loc.frequency ?? null,
          loc.tax_id ?? null,
          loc.start_date ?? null
        );
      }

      const insertReference = db.prepare(
        `INSERT INTO provider_references (provider_id, ref_number, name_title, phone, email, address)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const ref of references) {
        insertReference.run(
          newId,
          ref.ref_number,
          ref.name_title ?? null,
          ref.phone ?? null,
          ref.email ?? null,
          ref.address ?? null
        );
      }

      const insertDisclosure = db.prepare(
        `INSERT INTO provider_disclosures (provider_id, question_key, answer, explanation)
         VALUES (?, ?, ?, ?)`
      );
      for (const d of disclosures) {
        if (!d.question_key) continue;
        insertDisclosure.run(newId, d.question_key, d.answer ?? null, d.explanation ?? null);
      }

      return newId;
    })();

    const created = db.prepare("SELECT * FROM providers WHERE id = ?").get(providerId) as Provider;
    return NextResponse.json({ ...created, ssn: maskSsn(created.ssn) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create provider.";
    const isDuplicate = message.includes("UNIQUE");
    return NextResponse.json(
      { error: isDuplicate ? "A provider with this NPI already exists." : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
