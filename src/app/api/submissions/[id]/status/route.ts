import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db, { uploadsDir } from "@/lib/db";
import { PayerSubmission } from "@/lib/types";
import { requireAdmin } from "@/lib/auth";

const VALID_STATUSES = ["pending", "approved", "denied", "terminated"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;
  const existing = db
    .prepare("SELECT * FROM payer_submissions WHERE id = ?")
    .get(id) as PayerSubmission | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const formData = await req.formData();
  const status = formData.get("status") as string;
  const approvedThrough = (formData.get("approved_through") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const evidenceFile = formData.get("evidence_file");

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  let evidenceFileName = existing.evidence_file_name;
  let evidenceFilePath = existing.evidence_file_path;
  let evidenceFileMime = existing.evidence_file_mime;

  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    const ext = path.extname(evidenceFile.name) || "";
    const storedName = `submission_${id}_evidence_${Date.now()}${ext}`;
    const buffer = Buffer.from(await evidenceFile.arrayBuffer());
    fs.writeFileSync(path.join(uploadsDir, storedName), buffer);
    evidenceFileName = evidenceFile.name;
    evidenceFilePath = storedName;
    evidenceFileMime = evidenceFile.type || "application/octet-stream";
  }

  if (status === "approved") {
    if (!evidenceFilePath) {
      return NextResponse.json(
        { error: "Approving a submission requires an uploaded screenshot or document as evidence." },
        { status: 400 }
      );
    }
    if (!approvedThrough) {
      return NextResponse.json(
        { error: "Approving a submission requires an \"approved through\" date." },
        { status: 400 }
      );
    }
  }

  const decidedAt = status === "approved" || status === "denied" ? new Date().toISOString() : existing.decided_at;

  db.prepare(
    `UPDATE payer_submissions
     SET status = ?, decided_at = ?, effective_date = ?, approved_through = ?,
         evidence_file_name = ?, evidence_file_path = ?, evidence_file_mime = ?, notes = ?
     WHERE id = ?`
  ).run(
    status,
    decidedAt,
    status === "approved" ? new Date().toISOString().slice(0, 10) : existing.effective_date,
    approvedThrough,
    evidenceFileName,
    evidenceFilePath,
    evidenceFileMime,
    notes,
    id
  );

  const updated = db.prepare("SELECT * FROM payer_submissions WHERE id = ?").get(id);
  return NextResponse.json(updated);
}
