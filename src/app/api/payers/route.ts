import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Payer } from "@/lib/types";

export async function GET() {
  const rows = db.prepare("SELECT * FROM payers ORDER BY name").all() as Payer[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  try {
    const info = db
      .prepare("INSERT INTO payers (name, payer_type) VALUES (?, ?)")
      .run(body.name, body.payer_type ?? "commercial");
    const created = db.prepare("SELECT * FROM payers WHERE id = ?").get(info.lastInsertRowid);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
