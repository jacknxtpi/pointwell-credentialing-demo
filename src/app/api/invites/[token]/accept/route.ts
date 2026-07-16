import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { email, password } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 }
    );
  }

  const invite = db
    .prepare("SELECT * FROM provider_invites WHERE token = ?")
    .get(token) as { id: number; provider_id: number; used_at: string | null } | undefined;

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 409 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const result = db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO users (email, password_hash, role, provider_id) VALUES (?, ?, 'provider', ?)"
      )
      .run(normalizedEmail, hashPassword(password), invite.provider_id);
    db.prepare("UPDATE provider_invites SET used_at = datetime('now') WHERE id = ?").run(invite.id);
    return info.lastInsertRowid as number;
  })();

  const sessionToken = createSession(result);
  await setSessionCookie(sessionToken);

  return NextResponse.json({ ok: true });
}
