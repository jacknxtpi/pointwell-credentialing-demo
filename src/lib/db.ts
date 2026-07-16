import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "credentialing.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const uploadsDir =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npi TEXT UNIQUE NOT NULL,

    -- NPPES-sourced verification data
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    credential TEXT,
    nppes_specialty TEXT,
    nppes_practice_address TEXT,
    nppes_practice_phone TEXT,
    license_number TEXT,
    license_state TEXT,

    -- Personal information
    middle_name TEXT,
    other_names TEXT,
    titles TEXT,
    primary_service_location TEXT,
    first_day_date TEXT,
    home_address TEXT,
    personal_email TEXT,
    personal_phone TEXT,
    dob TEXT,
    city_of_birth TEXT,
    ssn TEXT,
    degrees TEXT,
    pcp_note TEXT,
    specialties TEXT,
    age_range_treated TEXT,
    opioid_treatment TEXT,
    special_populations TEXT,
    gender_for_directories TEXT,
    ethnicity_for_directories TEXT,

    -- CAQH (no password stored -- see caqh_has_login)
    caqh_profile_number TEXT,
    caqh_username TEXT,
    caqh_has_login TEXT,

    -- Professional IDs
    medicare_ptan_number TEXT,
    medicare_ptan_issued TEXT,
    medicare_ptan_expires TEXT,
    medicaid_number TEXT,
    medicaid_issued TEXT,
    medicaid_expires TEXT,
    railroad_medicare_number TEXT,
    railroad_medicare_issued TEXT,
    railroad_medicare_expires TEXT,

    -- Other credentialing identifiers (typed until document management exists)
    dea_number TEXT,
    board_certification_number TEXT,
    controlled_substance_number TEXT,
    liability_ins_start TEXT,
    liability_ins_end TEXT,

    -- Hospital admitting (if other than default facility)
    hospital_admitting_type TEXT,
    hospital_name TEXT,
    hospital_address TEXT,
    hospital_phone TEXT,

    -- Intake self-report, ahead of formal network tracking
    self_reported_innetwork_payers TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS provider_practice_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    name_and_address TEXT NOT NULL,
    frequency TEXT,
    tax_id TEXT,
    start_date TEXT
  );

  CREATE TABLE IF NOT EXISTS provider_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    ref_number INTEGER NOT NULL,
    name_title TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    UNIQUE(provider_id, ref_number)
  );

  CREATE TABLE IF NOT EXISTS provider_disclosures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    answer TEXT,
    explanation TEXT,
    UNIQUE(provider_id, question_key)
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
    approved_through TEXT,
    evidence_file_name TEXT,
    evidence_file_path TEXT,
    evidence_file_mime TEXT,
    notes TEXT,
    UNIQUE(provider_id, payer_id)
  );

  -- Lets admins rename any packet field to match a specific payer's own
  -- terminology (e.g. our "Home address" might be that payer's "Residential Addr"),
  -- and exclude fields a given payer's form doesn't ask for at all.
  CREATE TABLE IF NOT EXISTS payer_field_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payer_id INTEGER NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    included INTEGER NOT NULL DEFAULT 1,
    UNIQUE(payer_id, field_key)
  );

  -- Network status tree: Payer -> Line of Business -> Plan -> provider status.
  -- Populated gradually over time from approved contracts and directory research.
  CREATE TABLE IF NOT EXISTS lines_of_business (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payer_id INTEGER NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(payer_id, name)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_of_business_id INTEGER NOT NULL REFERENCES lines_of_business(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(line_of_business_id, name)
  );

  -- Every network status entry requires uploaded proof (screenshot/portal export/email)
  -- and gets a server-set recorded_at timestamp -- these aren't user-editable, so the
  -- record reflects when the confirmation was actually captured, not a typed-in date.
  CREATE TABLE IF NOT EXISTS network_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    confirmation_source TEXT,
    effective_date TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    evidence_file_name TEXT,
    evidence_file_path TEXT,
    evidence_file_mime TEXT,
    notes TEXT,
    UNIQUE(provider_id, plan_id)
  );

  -- Document management: one current document per provider per required document type.
  -- Re-uploading replaces the prior file/dates rather than keeping history, matching
  -- the source form's "don't provide expired, only active" instruction.
  CREATE TABLE IF NOT EXISTS provider_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    status TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT,
    file_mime TEXT,
    uploaded_at TEXT,
    issued_date TEXT,
    expires_date TEXT,
    notes TEXT,
    UNIQUE(provider_id, document_type)
  );

  -- Auth: admin accounts manage everything; provider accounts are scoped to
  -- their own provider_id via the invite flow below.
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin' | 'provider'
    provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- An admin generates a token and shares the resulting link manually (no real
  -- email delivery, matching how the rest of this demo treats external systems).
  CREATE TABLE IF NOT EXISTS provider_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    used_at TEXT
  );

  -- Every reveal of a provider's real (unmasked) SSN is logged: who, when, for
  -- which provider, and in service of which payer packet.
  CREATE TABLE IF NOT EXISTS ssn_reveal_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    payer_id INTEGER REFERENCES payers(id) ON DELETE SET NULL,
    revealed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;

export function maskSsn(ssn: string | null): string | null {
  if (!ssn) return ssn;
  const digits = ssn.replace(/\D/g, "");
  if (digits.length < 4) return "***-**-****";
  return `***-**-${digits.slice(-4)}`;
}
