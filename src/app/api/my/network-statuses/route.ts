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
      `SELECT ns.id, ns.status, ns.effective_date, ns.recorded_at,
              pl.name AS plan_name, lob.name AS line_of_business_name, pay.name AS payer_name
       FROM network_statuses ns
       JOIN plans pl ON pl.id = ns.plan_id
       JOIN lines_of_business lob ON lob.id = pl.line_of_business_id
       JOIN payers pay ON pay.id = lob.payer_id
       WHERE ns.provider_id = ?`
    )
    .all(user.provider_id);
  return NextResponse.json(rows);
}
