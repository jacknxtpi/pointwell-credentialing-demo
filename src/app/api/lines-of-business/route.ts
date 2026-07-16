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
      .prepare("SELECT * FROM lines_of_business WHERE payer_id = ? ORDER BY name")
      .all(payerId);
    return NextResponse.json(rows);
  }
  const rows = db.prepare("SELECT * FROM lines_of_business ORDER BY name").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  if (!body.payer_id || !body.name) {
    return NextResponse.json({ error: "payer_id and name are required." }, { status: 400 });
  }
  try {
    const info = db
      .prepare("INSERT INTO lines_of_business (payer_id, name) VALUES (?, ?)")
      .run(body.payer_id, body.name);
    const created = db
      .prepare("SELECT * FROM lines_of_business WHERE id = ?")
      .get(info.lastInsertRowid);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create line of business.";
    const isDuplicate = message.includes("UNIQUE");
    return NextResponse.json(
      { error: isDuplicate ? "This line of business already exists for this payer." : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
