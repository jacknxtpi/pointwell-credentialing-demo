import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "provider" || !user.provider_id) {
    return NextResponse.json({ error: "Provider access required." }, { status: 403 });
  }

  const rows = db
    .prepare(
      `SELECT s.id, s.payer_id, s.status, s.submitted_at, s.effective_date, s.approved_through, s.notes,
              pay.name AS payer_name
       FROM payer_submissions s
       JOIN payers pay ON pay.id = s.payer_id
       WHERE s.provider_id = ?
       ORDER BY s.submitted_at DESC`
    )
    .all(user.provider_id);
  return NextResponse.json(rows);
}
