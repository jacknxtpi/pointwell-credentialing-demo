import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const SELECT_JOINED = `
  SELECT
    ns.id, ns.provider_id, ns.plan_id, ns.status, ns.confirmation_source,
    ns.effective_date, ns.last_verified_date, ns.notes,
    p.first_name, p.last_name,
    pl.name AS plan_name, pl.line_of_business_id,
    lob.name AS line_of_business_name, lob.payer_id,
    pay.name AS payer_name
  FROM network_statuses ns
  JOIN providers p ON p.id = ns.provider_id
  JOIN plans pl ON pl.id = ns.plan_id
  JOIN lines_of_business lob ON lob.id = pl.line_of_business_id
  JOIN payers pay ON pay.id = lob.payer_id
`;

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const providerId = req.nextUrl.searchParams.get("provider_id");
  if (providerId) {
    const rows = db.prepare(`${SELECT_JOINED} WHERE ns.provider_id = ?`).all(providerId);
    return NextResponse.json(rows);
  }
  const rows = db.prepare(SELECT_JOINED).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  const { provider_id, plan_id, status, confirmation_source, effective_date, last_verified_date, notes } = body;

  if (!provider_id || !plan_id || !status) {
    return NextResponse.json(
      { error: "provider_id, plan_id, and status are required." },
      { status: 400 }
    );
  }
  if (status !== "in_network" && status !== "not_in_network") {
    return NextResponse.json(
      { error: "status must be 'in_network' or 'not_in_network'." },
      { status: 400 }
    );
  }

  try {
    db.prepare(
      `INSERT INTO network_statuses
         (provider_id, plan_id, status, confirmation_source, effective_date, last_verified_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider_id, plan_id) DO UPDATE SET
         status = excluded.status,
         confirmation_source = excluded.confirmation_source,
         effective_date = excluded.effective_date,
         last_verified_date = excluded.last_verified_date,
         notes = excluded.notes`
    ).run(
      provider_id,
      plan_id,
      status,
      confirmation_source ?? null,
      effective_date ?? null,
      last_verified_date ?? null,
      notes ?? null
    );

    const created = db
      .prepare(`${SELECT_JOINED} WHERE ns.provider_id = ? AND ns.plan_id = ?`)
      .get(provider_id, plan_id);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save network status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
