import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const lineOfBusinessId = req.nextUrl.searchParams.get("line_of_business_id");
  if (lineOfBusinessId) {
    const rows = db
      .prepare("SELECT * FROM plans WHERE line_of_business_id = ? ORDER BY name")
      .all(lineOfBusinessId);
    return NextResponse.json(rows);
  }
  const rows = db.prepare("SELECT * FROM plans ORDER BY name").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  if (!body.line_of_business_id || !body.name) {
    return NextResponse.json(
      { error: "line_of_business_id and name are required." },
      { status: 400 }
    );
  }
  try {
    const info = db
      .prepare("INSERT INTO plans (line_of_business_id, name) VALUES (?, ?)")
      .run(body.line_of_business_id, body.name);
    const created = db.prepare("SELECT * FROM plans WHERE id = ?").get(info.lastInsertRowid);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create plan.";
    const isDuplicate = message.includes("UNIQUE");
    return NextResponse.json(
      { error: isDuplicate ? "This plan already exists for this line of business." : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
