import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Provider } from "@/lib/types";

// Every reveal is logged (who, when, which provider, in service of which payer
// packet) so unmasking the real SSN is an explicit, auditable action rather
// than a default.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const payerId = req.nextUrl.searchParams.get("payer_id");

  const provider = db.prepare("SELECT * FROM providers WHERE id = ?").get(id) as Provider | undefined;
  if (!provider) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  db.prepare(
    "INSERT INTO ssn_reveal_log (user_id, provider_id, payer_id, revealed_at) VALUES (?, ?, ?, datetime('now'))"
  ).run(user.id, id, payerId ? Number(payerId) : null);

  return NextResponse.json({ ssn: provider.ssn });
}
