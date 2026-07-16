import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { provider_id } = await req.json();
  if (!provider_id) {
    return NextResponse.json({ error: "provider_id is required." }, { status: 400 });
  }

  const provider = db.prepare("SELECT id FROM providers WHERE id = ?").get(provider_id);
  if (!provider) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  const token = crypto.randomBytes(20).toString("hex");
  db.prepare("INSERT INTO provider_invites (provider_id, token) VALUES (?, ?)").run(
    provider_id,
    token
  );

  return NextResponse.json({ token, url: `/invite/${token}` }, { status: 201 });
}
