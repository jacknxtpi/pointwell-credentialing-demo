import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CustomPacketField } from "@/lib/types";

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const payerId = req.nextUrl.searchParams.get("payer_id");
  if (payerId) {
    const rows = db
      .prepare("SELECT * FROM custom_packet_fields WHERE payer_id = ? ORDER BY created_at")
      .all(payerId);
    return NextResponse.json(rows);
  }
  const rows = db.prepare("SELECT * FROM custom_packet_fields ORDER BY created_at").all();
  return NextResponse.json(rows);
}

function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `custom_${base || "field"}`;
}

// Each custom field belongs to exactly one payer -- it's that payer's own
// one-off question, not a shared/toggleable registry entry like the schema
// fields in packetFields.ts. Deleting or editing one never touches another
// payer's fields.
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  const label = (body.label ?? "").trim();
  const payerId = body.payer_id;

  if (!label) {
    return NextResponse.json({ error: "label is required." }, { status: 400 });
  }
  if (!payerId) {
    return NextResponse.json({ error: "payer_id is required." }, { status: 400 });
  }

  let fieldKey = slugify(label);
  const existingKeys = new Set(
    (db.prepare("SELECT field_key FROM custom_packet_fields").all() as { field_key: string }[]).map(
      (r) => r.field_key
    )
  );
  if (existingKeys.has(fieldKey)) {
    let suffix = 2;
    while (existingKeys.has(`${fieldKey}_${suffix}`)) suffix += 1;
    fieldKey = `${fieldKey}_${suffix}`;
  }

  const info = db
    .prepare("INSERT INTO custom_packet_fields (payer_id, field_key, label) VALUES (?, ?, ?)")
    .run(payerId, fieldKey, label);
  const created = db
    .prepare("SELECT * FROM custom_packet_fields WHERE id = ?")
    .get(info.lastInsertRowid) as CustomPacketField;

  return NextResponse.json(created, { status: 201 });
}
