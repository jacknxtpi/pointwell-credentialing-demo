import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Persists explicit sort positions for a payer's schema-backed fields (custom
// fields carry their own sort_order directly on custom_packet_fields, since
// they belong to one payer already). Takes {field_key, sort_order} pairs
// rather than inferring order from array position, so a mixed list of schema
// and custom fields on the client can share one consistent numbering scheme.
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  const { payer_id, fields } = body;

  if (!payer_id || !Array.isArray(fields)) {
    return NextResponse.json(
      { error: "payer_id and fields (array of {field_key, sort_order}) are required." },
      { status: 400 }
    );
  }

  const upsert = db.prepare(
    `INSERT INTO payer_field_labels (payer_id, field_key, label, included, sort_order)
     VALUES (?, ?, '', 1, ?)
     ON CONFLICT(payer_id, field_key) DO UPDATE SET sort_order = excluded.sort_order`
  );
  const applyOrder = db.transaction((rows: { field_key: string; sort_order: number }[]) => {
    for (const row of rows) upsert.run(payer_id, row.field_key, row.sort_order);
  });
  applyOrder(fields);

  const rows = db.prepare("SELECT * FROM payer_field_labels WHERE payer_id = ?").all(payer_id);
  return NextResponse.json(rows);
}
