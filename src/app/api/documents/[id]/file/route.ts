import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db, { uploadsDir } from "@/lib/db";
import { ProviderDocument } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Access required." }, { status: 403 });
  }
  const { id } = await params;
  const doc = db
    .prepare("SELECT * FROM provider_documents WHERE id = ?")
    .get(id) as ProviderDocument | undefined;

  if (!doc || !doc.file_path) {
    return NextResponse.json({ error: "No file on record." }, { status: 404 });
  }

  if (user.role !== "admin" && doc.provider_id !== user.provider_id) {
    return NextResponse.json({ error: "Access required." }, { status: 403 });
  }

  const fullPath = path.join(uploadsDir, doc.file_path);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File missing from storage." }, { status: 404 });
  }

  const buffer = fs.readFileSync(fullPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.file_mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.file_name ?? doc.file_path}"`,
    },
  });
}
