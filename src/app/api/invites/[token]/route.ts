import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = db
    .prepare(
      `SELECT i.id, i.used_at, p.id AS provider_id, p.first_name, p.last_name, p.npi
       FROM provider_invites i
       JOIN providers p ON p.id = i.provider_id
       WHERE i.token = ?`
    )
    .get(token) as
    | { id: number; used_at: string | null; provider_id: number; first_name: string; last_name: string; npi: string }
    | undefined;

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 409 });
  }

  return NextResponse.json({
    provider_id: invite.provider_id,
    first_name: invite.first_name,
    last_name: invite.last_name,
    npi: invite.npi,
  });
}
