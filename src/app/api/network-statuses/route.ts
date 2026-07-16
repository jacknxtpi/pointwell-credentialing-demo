import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db, { uploadsDir } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const SELECT_JOINED = `
  SELECT
    ns.id, ns.provider_id, ns.plan_id, ns.status, ns.confirmation_source,
    ns.effective_date, ns.recorded_at, ns.evidence_file_name, ns.evidence_file_path,
    ns.evidence_file_mime, ns.notes,
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

  const formData = await req.formData();
  const providerId = formData.get("provider_id");
  const planId = formData.get("plan_id");
  const status = formData.get("status");
  const confirmationSource = (formData.get("confirmation_source") as string) || null;
  const effectiveDate = (formData.get("effective_date") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const file = formData.get("evidence_file");

  if (!providerId || !planId || !status) {
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
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Confirmation proof (a screenshot or document) is required to record network status." },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name) || "";
  const storedName = `network_${providerId}_${planId}_${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir, storedName), buffer);

  try {
    db.prepare(
      `INSERT INTO network_statuses
         (provider_id, plan_id, status, confirmation_source, effective_date, recorded_at,
          evidence_file_name, evidence_file_path, evidence_file_mime, notes)
       VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
       ON CONFLICT(provider_id, plan_id) DO UPDATE SET
         status = excluded.status,
         confirmation_source = excluded.confirmation_source,
         effective_date = excluded.effective_date,
         recorded_at = datetime('now'),
         evidence_file_name = excluded.evidence_file_name,
         evidence_file_path = excluded.evidence_file_path,
         evidence_file_mime = excluded.evidence_file_mime,
         notes = excluded.notes`
    ).run(
      providerId,
      planId,
      status,
      confirmationSource,
      effectiveDate,
      file.name,
      storedName,
      file.type || "application/octet-stream",
      notes
    );

    const created = db
      .prepare(`${SELECT_JOINED} WHERE ns.provider_id = ? AND ns.plan_id = ?`)
      .get(providerId, planId);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save network status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
