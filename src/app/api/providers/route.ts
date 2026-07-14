import { NextRequest, NextResponse } from "next/server";
import db, { maskSsn } from "@/lib/db";
import { Provider } from "@/lib/types";

export async function GET() {
  const rows = db
    .prepare("SELECT * FROM providers ORDER BY last_name, first_name")
    .all() as Provider[];
  const masked = rows.map((p) => ({ ...p, ssn: maskSsn(p.ssn) }));
  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.npi || !body.first_name || !body.last_name) {
    return NextResponse.json(
      { error: "npi, first_name, and last_name are required." },
      { status: 400 }
    );
  }

  const columns = [
    "npi",
    "first_name",
    "last_name",
    "credential",
    "provider_type",
    "primary_practice_address",
    "primary_practice_phone",
    "work_email",
    "home_address",
    "medicare_ptan_individual",
    "medicare_ptan_reassignment",
    "medicaid_ptan_individual",
    "license_number",
    "license_state",
    "dea_number",
    "board_certification_number",
    "controlled_substance_number",
    "caqh_number",
    "liability_ins_start",
    "liability_ins_end",
    "dob",
    "ssn",
    "hire_date",
  ];

  const values = columns.map((c) => body[c] ?? null);

  try {
    const stmt = db.prepare(
      `INSERT INTO providers (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`
    );
    const info = stmt.run(...values);
    const created = db
      .prepare("SELECT * FROM providers WHERE id = ?")
      .get(info.lastInsertRowid) as Provider;
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
