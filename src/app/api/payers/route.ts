import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Payer } from "@/lib/types";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const rows = db.prepare("SELECT * FROM payers ORDER BY name").all() as Payer[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
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
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "A payer with that name already exists." }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Failed to create payer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
