import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SELF_SERVICE_COLUMNS } from "@/lib/providerColumns";
import { Provider, PracticeLocation, Reference, Disclosure } from "@/lib/types";

async function requireProviderUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "provider" || !user.provider_id) {
    return null;
  }
  return user;
}

export async function GET() {
  const user = await requireProviderUser();
  if (!user) {
    return NextResponse.json({ error: "Provider access required." }, { status: 403 });
  }

  const provider = db
    .prepare("SELECT * FROM providers WHERE id = ?")
    .get(user.provider_id) as Provider | undefined;
  if (!provider) {
    return NextResponse.json({ error: "Provider record not found." }, { status: 404 });
  }

  const practiceLocations = db
    .prepare("SELECT * FROM provider_practice_locations WHERE provider_id = ? ORDER BY id")
    .all(user.provider_id) as PracticeLocation[];
  const references = db
    .prepare("SELECT * FROM provider_references WHERE provider_id = ? ORDER BY ref_number")
    .all(user.provider_id) as Reference[];
  const disclosures = db
    .prepare("SELECT * FROM provider_disclosures WHERE provider_id = ? ORDER BY id")
    .all(user.provider_id) as Disclosure[];

  return NextResponse.json({
    ...provider,
    practice_locations: practiceLocations,
    references,
    disclosures,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await requireProviderUser();
  if (!user) {
    return NextResponse.json({ error: "Provider access required." }, { status: 403 });
  }

  const body = await req.json();
  const values = SELF_SERVICE_COLUMNS.map((c) => body[c] ?? null);

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

  db.transaction(() => {
    db.prepare(
      `UPDATE providers SET ${SELF_SERVICE_COLUMNS.map((c) => `${c} = ?`).join(", ")}, updated_at = datetime('now')
       WHERE id = ?`
    ).run(...values, user.provider_id);

    db.prepare("DELETE FROM provider_practice_locations WHERE provider_id = ?").run(user.provider_id);
    const insertLocation = db.prepare(
      `INSERT INTO provider_practice_locations (provider_id, name_and_address, frequency, tax_id, start_date)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const loc of practiceLocations) {
      if (!loc.name_and_address) continue;
      insertLocation.run(
        user.provider_id,
        loc.name_and_address,
        loc.frequency ?? null,
        loc.tax_id ?? null,
        loc.start_date ?? null
      );
    }

    db.prepare("DELETE FROM provider_references WHERE provider_id = ?").run(user.provider_id);
    const insertReference = db.prepare(
      `INSERT INTO provider_references (provider_id, ref_number, name_title, phone, email, address)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const ref of references) {
      insertReference.run(
        user.provider_id,
        ref.ref_number,
        ref.name_title ?? null,
        ref.phone ?? null,
        ref.email ?? null,
        ref.address ?? null
      );
    }

    const insertDisclosure = db.prepare(
      `INSERT INTO provider_disclosures (provider_id, question_key, answer, explanation)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(provider_id, question_key) DO UPDATE SET answer = excluded.answer, explanation = excluded.explanation`
    );
    for (const d of disclosures) {
      if (!d.question_key) continue;
      insertDisclosure.run(user.provider_id, d.question_key, d.answer ?? null, d.explanation ?? null);
    }
  })();

  const updated = db.prepare("SELECT * FROM providers WHERE id = ?").get(user.provider_id);
  return NextResponse.json(updated);
}
