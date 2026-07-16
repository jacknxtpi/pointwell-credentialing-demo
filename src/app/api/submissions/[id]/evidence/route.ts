import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db, { uploadsDir } from "@/lib/db";
import { PayerSubmission } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const submission = db
    .prepare("SELECT * FROM payer_submissions WHERE id = ?")
    .get(id) as PayerSubmission | undefined;

  if (!submission || !submission.evidence_file_path) {
    return NextResponse.json({ error: "No evidence on record." }, { status: 404 });
  }

  const allowed =
    user && (user.role === "admin" || (user.role === "provider" && user.provider_id === submission.provider_id));
  if (!allowed) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const fullPath = path.join(uploadsDir, submission.evidence_file_path);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File missing from storage." }, { status: 404 });
  }

  const buffer = fs.readFileSync(fullPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": submission.evidence_file_mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${submission.evidence_file_name ?? submission.evidence_file_path}"`,
    },
  });
}
