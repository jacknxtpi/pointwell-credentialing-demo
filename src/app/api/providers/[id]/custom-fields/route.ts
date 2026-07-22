import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const SELECT_JOINED = `
  SELECT
    cf.id AS custom_field_id, cf.field_key, cf.label, cf.sort_order,
    cf.payer_id, pay.name AS payer_name,
    v.value
  FROM custom_packet_fields cf
  JOIN payers pay ON pay.id = cf.payer_id
  LEFT JOIN provider_custom_field_values v
    ON v.custom_field_id = cf.id AND v.provider_id = ?
  WHERE cf.included = 1
  ORDER BY pay.name, cf.sort_order, cf.created_at
`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;
  const rows = db.prepare(SELECT_JOINED).all(id);
  return NextResponse.json(rows);
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
  const values: Record<string, string> = body.values ?? {};

  const upsert = db.prepare(
    `INSERT INTO provider_custom_field_values (provider_id, custom_field_id, value)
     VALUES (?, ?, ?)
     ON CONFLICT(provider_id, custom_field_id) DO UPDATE SET value = excluded.value`
  );

  db.transaction(() => {
    for (const [customFieldId, value] of Object.entries(values)) {
      upsert.run(id, customFieldId, value);
    }
  })();

  const rows = db.prepare(SELECT_JOINED).all(id);
  return NextResponse.json(rows);
}
