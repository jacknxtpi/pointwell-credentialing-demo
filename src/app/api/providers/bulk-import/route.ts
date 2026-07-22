import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PROVIDER_COLUMNS } from "@/lib/providerColumns";

type RowResult = {
  row: number;
  npi: string | null;
  status: "created" | "updated" | "skipped" | "error";
  message?: string;
};

const UPDATE_COLUMNS = PROVIDER_COLUMNS.filter((c) => c !== "npi");

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json();
  const rows: Record<string, string>[] = Array.isArray(body.rows) ? body.rows : [];
  const updateExisting = Boolean(body.update_existing);

  if (rows.length === 0) {
    return NextResponse.json({ error: "rows (non-empty array) is required." }, { status: 400 });
  }

  const existingNpis = new Set(
    (db.prepare("SELECT npi FROM providers").all() as { npi: string }[]).map((r) => r.npi)
  );

  const insert = db.prepare(
    `INSERT INTO providers (${PROVIDER_COLUMNS.join(", ")}) VALUES (${PROVIDER_COLUMNS.map(() => "?").join(", ")})`
  );

  const results: RowResult[] = [];
  const seenInBatch = new Set<string>();

  db.transaction(() => {
    rows.forEach((rawRow, index) => {
      // Only ever write columns we know about -- never trust arbitrary keys from the request body.
      const row: Record<string, string> = {};
      for (const col of PROVIDER_COLUMNS) {
        if (rawRow[col] !== undefined) row[col] = String(rawRow[col]).trim();
      }

      const npi = row.npi || "";
      if (!npi || !row.first_name || !row.last_name) {
        results.push({ row: index, npi: npi || null, status: "error", message: "Missing NPI, first name, or last name." });
        return;
      }
      if (!/^\d{10}$/.test(npi)) {
        results.push({ row: index, npi, status: "error", message: "NPI must be exactly 10 digits." });
        return;
      }
      if (seenInBatch.has(npi)) {
        results.push({ row: index, npi, status: "error", message: "Duplicate NPI within this file." });
        return;
      }
      seenInBatch.add(npi);

      const exists = existingNpis.has(npi);
      if (exists && !updateExisting) {
        results.push({ row: index, npi, status: "skipped", message: "Provider with this NPI already exists." });
        return;
      }

      if (exists) {
        // Only touch columns this row actually supplied a value for -- an
        // unmapped column must leave the provider's existing data alone,
        // not overwrite it with null.
        const suppliedColumns = UPDATE_COLUMNS.filter((c) => row[c] !== undefined);
        if (suppliedColumns.length > 0) {
          const setClause = suppliedColumns.map((c) => `${c} = ?`).join(", ");
          const updateValues = suppliedColumns.map((c) => row[c]);
          db.prepare(`UPDATE providers SET ${setClause}, updated_at = datetime('now') WHERE npi = ?`).run(
            ...updateValues,
            npi
          );
        }
        results.push({ row: index, npi, status: "updated" });
      } else {
        const values = PROVIDER_COLUMNS.map((c) => row[c] ?? null);
        insert.run(...values);
        existingNpis.add(npi);
        results.push({ row: index, npi, status: "created" });
      }
    });
  })();

  const summary = results.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { created: 0, updated: 0, skipped: 0, error: 0 }
  );

  return NextResponse.json({ results, summary });
}
