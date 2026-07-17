import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db, { uploadsDir } from "@/lib/db";
import { ProviderDocument } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";

async function requireProviderUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "provider" || !user.provider_id) {
    return null;
  }
  return user;
}

export async function GET() {
  const user = await requireProviderUser();
  if (!user) {
    return NextResponse.json({ error: "Provider access required." }, { status: 403 });
  }
  const rows = db
    .prepare("SELECT * FROM provider_documents WHERE provider_id = ?")
    .all(user.provider_id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireProviderUser();
  if (!user) {
    return NextResponse.json({ error: "Provider access required." }, { status: 403 });
  }
  const providerId = user.provider_id;

  const formData = await req.formData();
  const documentType = formData.get("document_type");
  const status = formData.get("status");
  const issuedDate = (formData.get("issued_date") as string) || null;
  const expiresDate = (formData.get("expires_date") as string) || null;
  const file = formData.get("file");

  if (!documentType || (status !== "on_file" && status !== "on_caqh")) {
    return NextResponse.json(
      { error: "document_type and a valid status ('on_file' or 'on_caqh') are required." },
      { status: 400 }
    );
  }

  const existing = db
    .prepare("SELECT * FROM provider_documents WHERE provider_id = ? AND document_type = ?")
    .get(providerId, documentType) as ProviderDocument | undefined;

  let fileName: string | null = existing?.file_name ?? null;
  let filePath: string | null = existing?.file_path ?? null;
  let fileMime: string | null = existing?.file_mime ?? null;
  let uploadedAt: string | null = existing?.uploaded_at ?? null;

  if (status === "on_caqh") {
    fileName = null;
    filePath = null;
    fileMime = null;
    uploadedAt = null;
  } else if (file instanceof File && file.size > 0) {
    const ext = path.extname(file.name) || "";
    const storedName = `${providerId}_${documentType}_${Date.now()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(uploadsDir, storedName), buffer);
    fileName = file.name;
    filePath = storedName;
    fileMime = file.type || "application/octet-stream";
    uploadedAt = new Date().toISOString();
  } else if (!filePath) {
    return NextResponse.json(
      { error: "A file is required when status is 'on_file' (unless one is already on file)." },
      { status: 400 }
    );
  }

  db.prepare(
    `INSERT INTO provider_documents
       (provider_id, document_type, status, file_name, file_path, file_mime, uploaded_at, issued_date, expires_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider_id, document_type) DO UPDATE SET
       status = excluded.status,
       file_name = excluded.file_name,
       file_path = excluded.file_path,
       file_mime = excluded.file_mime,
       uploaded_at = excluded.uploaded_at,
       issued_date = excluded.issued_date,
       expires_date = excluded.expires_date`
  ).run(
    providerId,
    documentType,
    status,
    fileName,
    filePath,
    fileMime,
    uploadedAt,
    issuedDate,
    expiresDate,
    existing?.notes ?? null
  );

  const saved = db
    .prepare("SELECT * FROM provider_documents WHERE provider_id = ? AND document_type = ?")
    .get(providerId, documentType);
  return NextResponse.json(saved, { status: 201 });
}
