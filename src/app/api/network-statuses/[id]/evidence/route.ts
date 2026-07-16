import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db, { uploadsDir } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NetworkStatus } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const status = db
    .prepare("SELECT * FROM network_statuses WHERE id = ?")
    .get(id) as NetworkStatus | undefined;

  if (!status || !status.evidence_file_path) {
    return NextResponse.json({ error: "No confirmation proof on record." }, { status: 404 });
  }

  const fullPath = path.join(uploadsDir, status.evidence_file_path);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File missing from storage." }, { status: 404 });
  }

  const buffer = fs.readFileSync(fullPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": status.evidence_file_mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${status.evidence_file_name ?? status.evidence_file_path}"`,
    },
  });
}
