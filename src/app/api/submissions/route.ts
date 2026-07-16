import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const SELECT_JOINED = `
  SELECT
    s.id, s.provider_id, s.payer_id, s.status, s.submitted_at, s.decided_at, s.effective_date,
    s.approved_through, s.evidence_file_name, s.evidence_file_path, s.evidence_file_mime, s.notes,
    p.first_name, p.last_name, p.npi, p.specialties,
    pay.name AS payer_name, pay.payer_type
  FROM payer_submissions s
  JOIN providers p ON p.id = s.provider_id
  JOIN payers pay ON pay.id = s.payer_id
`;

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const providerId = req.nextUrl.searchParams.get("provider_id");
  if (providerId) {
    const rows = db
      .prepare(`${SELECT_JOINED} WHERE s.provider_id = ? ORDER BY s.submitted_at DESC`)
      .all(providerId);
    return NextResponse.json(rows);
  }
  const rows = db.prepare(`${SELECT_JOINED} ORDER BY s.submitted_at DESC`).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  const { provider_id, payer_id } = body;

  if (!provider_id || !payer_id) {
    return NextResponse.json(
      { error: "provider_id and payer_id are required." },
      { status: 400 }
    );
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO payer_submissions (provider_id, payer_id, status, notes)
         VALUES (?, ?, 'pending', ?)`
      )
      .run(provider_id, payer_id, body.notes ?? "Submission packet generated; awaiting payer decision.");
    const created = db
      .prepare(`${SELECT_JOINED} WHERE s.id = ?`)
      .get(info.lastInsertRowid);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create submission.";
    const isDuplicate = message.includes("UNIQUE");
    return NextResponse.json(
      {
        error: isDuplicate
          ? "This provider already has a submission on file for this payer."
          : message,
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
