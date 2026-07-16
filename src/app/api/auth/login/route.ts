import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: "admin" | "provider";
  provider_id: number | null;
};

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email).toLowerCase().trim()) as UserRow | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = createSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    provider_id: user.provider_id,
  });
}
