import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { PayerSubmission } from "@/lib/types";

// Simulates a payer processing an application. No real payer is contacted —
// this exists to demo the status-tracking workflow before real integrations exist.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const submission = db
    .prepare("SELECT * FROM payer_submissions WHERE id = ?")
    .get(id) as PayerSubmission | undefined;

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  if (submission.status === "submitted") {
    db.prepare("UPDATE payer_submissions SET status = 'pending' WHERE id = ?").run(id);
  } else if (submission.status === "pending") {
    const approved = Math.random() < 0.8;
    const decidedAt = new Date().toISOString();
    if (approved) {
      const effective = new Date();
      effective.setDate(effective.getDate() + 30);
      db.prepare(
        `UPDATE payer_submissions
         SET status = 'approved', decided_at = ?, effective_date = ?, notes = ?
         WHERE id = ?`
      ).run(
        decidedAt,
        effective.toISOString().slice(0, 10),
        "Simulated approval — no real payer contacted.",
        id
      );
    } else {
      db.prepare(
        `UPDATE payer_submissions
         SET status = 'denied', decided_at = ?, notes = ?
         WHERE id = ?`
      ).run(decidedAt, "Simulated denial — no real payer contacted.", id);
    }
  }

  const updated = db.prepare("SELECT * FROM payer_submissions WHERE id = ?").get(id);
  return NextResponse.json(updated);
}
