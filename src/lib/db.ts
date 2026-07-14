import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "credentialing.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npi TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    credential TEXT,
    provider_type TEXT,
    primary_practice_address TEXT,
    primary_practice_phone TEXT,
    work_email TEXT,
    home_address TEXT,
    medicare_ptan_individual TEXT,
    medicare_ptan_reassignment TEXT,
    medicaid_ptan_individual TEXT,
    license_number TEXT,
    license_state TEXT,
    dea_number TEXT,
    board_certification_number TEXT,
    controlled_substance_number TEXT,
    caqh_number TEXT,
    liability_ins_start TEXT,
    liability_ins_end TEXT,
    dob TEXT,
    ssn TEXT,
    hire_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    payer_type TEXT NOT NULL DEFAULT 'commercial'
  );

  CREATE TABLE IF NOT EXISTS payer_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    payer_id INTEGER NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'submitted',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    decided_at TEXT,
    effective_date TEXT,
    notes TEXT,
    UNIQUE(provider_id, payer_id)
  );
`);

export default db;

export function maskSsn(ssn: string | null): string | null {
  if (!ssn) return ssn;
  const digits = ssn.replace(/\D/g, "");
  if (digits.length < 4) return "***-**-****";
  return `***-**-${digits.slice(-4)}`;
}
