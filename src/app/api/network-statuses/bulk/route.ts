import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db, { uploadsDir } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Marks a provider's network status the same way across every current line of
// business/plan under one payer in a single action (one uploaded proof, one
// timestamp) instead of requiring a separate upload per plan — payers often
// confirm participation across all their lines of business at once.
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const formData = await req.formData();
  const providerId = formData.get("provider_id");
  const payerId = formData.get("payer_id");
  const status = formData.get("status");
  const confirmationSource = (formData.get("confirmation_source") as string) || null;
  const effectiveDate = (formData.get("effective_date") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const file = formData.get("evidence_file");

  if (!providerId || !payerId || !status) {
    return NextResponse.json(
      { error: "provider_id, payer_id, and status are required." },
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

  const plans = db
    .prepare(
      `SELECT pl.id
       FROM plans pl
       JOIN lines_of_business lob ON lob.id = pl.line_of_business_id
       WHERE lob.payer_id = ?`
    )
    .all(payerId) as { id: number }[];

  if (plans.length === 0) {
    return NextResponse.json(
      { error: "This payer has no lines of business/plans yet — add at least one before bulk updating." },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name) || "";
  const storedName = `network_bulk_${providerId}_${payerId}_${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir, storedName), buffer);

  const upsert = db.prepare(
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
  );

  const applyAll = db.transaction((planIds: number[]) => {
    for (const planId of planIds) {
      upsert.run(
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
    }
  });
  applyAll(plans.map((p) => p.id));

  return NextResponse.json({ updated: plans.length }, { status: 201 });
}
