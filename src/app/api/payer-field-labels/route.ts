import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const payerId = req.nextUrl.searchParams.get("payer_id");
  if (payerId) {
    const rows = db
      .prepare("SELECT * FROM payer_field_labels WHERE payer_id = ?")
      .all(payerId);
    return NextResponse.json(rows);
  }
  const rows = db.prepare("SELECT * FROM payer_field_labels").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  const { payer_id, field_key, label } = body;
  const included = body.included === false || body.included === 0 ? 0 : 1;

  if (!payer_id || !field_key) {
    return NextResponse.json({ error: "payer_id and field_key are required." }, { status: 400 });
  }

  const trimmedLabel = (label ?? "").trim();

  if (!trimmedLabel && included === 1) {
    db.prepare("DELETE FROM payer_field_labels WHERE payer_id = ? AND field_key = ?").run(
      payer_id,
      field_key
    );
    return NextResponse.json({ deleted: true });
  }

  db.prepare(
    `INSERT INTO payer_field_labels (payer_id, field_key, label, included)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(payer_id, field_key) DO UPDATE SET label = excluded.label, included = excluded.included`
  ).run(payer_id, field_key, trimmedLabel, included);

  const saved = db
    .prepare("SELECT * FROM payer_field_labels WHERE payer_id = ? AND field_key = ?")
    .get(payer_id, field_key);
  return NextResponse.json(saved, { status: 201 });
}
