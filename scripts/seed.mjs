import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "credentialing.db");
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

const payers = [
  ["Healthcare X", "commercial"],
  ["Medicare", "medicare"],
  ["State Medicaid", "medicaid"],
  ["Blue Shield Regional", "commercial"],
];

const insertPayer = db.prepare("INSERT OR IGNORE INTO payers (name, payer_type) VALUES (?, ?)");
for (const [name, type] of payers) insertPayer.run(name, type);

// NPIs paired with entirely fabricated demo data for every field NPPES doesn't provide.
const demoProviders = [
  {
    npi: "1234567893", // NPPES documented test NPI (valid Luhn checksum)
    first_name: "Mark",
    last_name: "Douglas",
    credential: "MD",
    provider_type: "Internal Medicine",
    primary_practice_address: "100 Clinic Way, Springfield, IL, 62701",
    primary_practice_phone: "2175551234",
    work_email: "mdouglas@clinic-demo.org",
    home_address: "22 Oak St, Springfield, IL, 62704",
    medicare_ptan_individual: "IL12345",
    medicare_ptan_reassignment: "IL12345-RR",
    medicaid_ptan_individual: "MCD-99881",
    license_number: "IL-MD-445566",
    license_state: "IL",
    dea_number: "BD1234563",
    board_certification_number: "ABIM-778899",
    controlled_substance_number: "CS-556677",
    caqh_number: "CAQH-8834451",
    liability_ins_start: "2025-01-01",
    liability_ins_end: "2026-01-01",
    dob: "1980-04-12",
    ssn: "000-00-0001",
    hire_date: "2019-06-01",
  },
  {
    npi: "1112223330",
    first_name: "Priya",
    last_name: "Anand",
    credential: "DO",
    provider_type: "Family Medicine",
    primary_practice_address: "100 Clinic Way, Springfield, IL, 62701",
    primary_practice_phone: "2175551234",
    work_email: "panand@clinic-demo.org",
    home_address: "8 Maple Ave, Springfield, IL, 62702",
    medicare_ptan_individual: "IL55223",
    medicare_ptan_reassignment: "IL55223-RR",
    medicaid_ptan_individual: "MCD-44120",
    license_number: "IL-DO-119922",
    license_state: "IL",
    dea_number: "AA9876543",
    board_certification_number: "ABFM-334455",
    controlled_substance_number: "CS-889900",
    caqh_number: "CAQH-2210987",
    liability_ins_start: "2025-03-01",
    liability_ins_end: "2026-03-01",
    dob: "1985-09-23",
    ssn: "000-00-0002",
    hire_date: "2021-02-15",
  },
];

const insertProvider = db.prepare(`
  INSERT OR IGNORE INTO providers (
    npi, first_name, last_name, credential, provider_type, primary_practice_address,
    primary_practice_phone, work_email, home_address, medicare_ptan_individual,
    medicare_ptan_reassignment, medicaid_ptan_individual, license_number, license_state,
    dea_number, board_certification_number, controlled_substance_number, caqh_number,
    liability_ins_start, liability_ins_end, dob, ssn, hire_date
  ) VALUES (
    @npi, @first_name, @last_name, @credential, @provider_type, @primary_practice_address,
    @primary_practice_phone, @work_email, @home_address, @medicare_ptan_individual,
    @medicare_ptan_reassignment, @medicaid_ptan_individual, @license_number, @license_state,
    @dea_number, @board_certification_number, @controlled_substance_number, @caqh_number,
    @liability_ins_start, @liability_ins_end, @dob, @ssn, @hire_date
  )
`);
for (const p of demoProviders) insertProvider.run(p);

const getPayerId = db.prepare("SELECT id FROM payers WHERE name = ?");
const getProviderId = db.prepare("SELECT id FROM providers WHERE npi = ?");
const insertSubmission = db.prepare(`
  INSERT OR IGNORE INTO payer_submissions (provider_id, payer_id, status, submitted_at, decided_at, effective_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const mark = getProviderId.get("1234567893").id;
const priya = getProviderId.get("1112223330").id;
const healthcareX = getPayerId.get("Healthcare X").id;
const medicare = getPayerId.get("Medicare").id;
const medicaid = getPayerId.get("State Medicaid").id;
const blueShield = getPayerId.get("Blue Shield Regional").id;

insertSubmission.run(
  mark,
  healthcareX,
  "approved",
  "2026-05-01 09:00:00",
  "2026-05-20 10:00:00",
  "2026-06-20",
  "Simulated approval — no real payer contacted."
);
insertSubmission.run(mark, medicare, "pending", "2026-07-01 09:00:00", null, null, "Simulated submission — no real payer contacted.");
insertSubmission.run(priya, healthcareX, "submitted", "2026-07-10 09:00:00", null, null, "Simulated submission — no real payer contacted.");
insertSubmission.run(
  priya,
  medicaid,
  "denied",
  "2026-04-01 09:00:00",
  "2026-04-25 10:00:00",
  null,
  "Simulated denial — no real payer contacted."
);

console.log("Seeded payers, 2 demo providers, and sample submissions.");
