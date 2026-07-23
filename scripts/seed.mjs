import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH ?? path.join(__dirname, "..", "data", "credentialing.db");
const uploadsDir = process.env.UPLOADS_DIR ?? path.join(__dirname, "..", "data", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
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
    nppes_specialty TEXT,
    nppes_practice_address TEXT,
    nppes_practice_phone TEXT,
    license_number TEXT,
    license_state TEXT,
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
    caqh_profile_number TEXT,
    caqh_username TEXT,
    caqh_has_login TEXT,
    medicare_ptan_number TEXT,
    medicare_ptan_issued TEXT,
    medicare_ptan_expires TEXT,
    medicaid_number TEXT,
    medicaid_issued TEXT,
    medicaid_expires TEXT,
    railroad_medicare_number TEXT,
    railroad_medicare_issued TEXT,
    railroad_medicare_expires TEXT,
    dea_number TEXT,
    board_certification_number TEXT,
    controlled_substance_number TEXT,
    liability_ins_start TEXT,
    liability_ins_end TEXT,
    hospital_admitting_type TEXT,
    hospital_name TEXT,
    hospital_address TEXT,
    hospital_phone TEXT,
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

  CREATE TABLE IF NOT EXISTS payer_field_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payer_id INTEGER NOT NULL REFERENCES payers(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    included INTEGER NOT NULL DEFAULT 1,
    UNIQUE(payer_id, field_key)
  );

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

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
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

  CREATE TABLE IF NOT EXISTS provider_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    used_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ssn_reveal_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    payer_id INTEGER REFERENCES payers(id) ON DELETE SET NULL,
    revealed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const payers = [
  ["Healthcare X", "commercial"],
  ["Medicare", "medicare"],
  ["State Medicaid", "medicaid"],
  ["Blue Shield Regional", "commercial"],
  ["Medica Health Plans", "commercial"],
];

const insertPayer = db.prepare("INSERT OR IGNORE INTO payers (name, payer_type) VALUES (?, ?)");
for (const [name, type] of payers) insertPayer.run(name, type);

// NPIs that return 0 results from the real NPPES registry, so they never collide
// with a real record when someone tries the live NPI lookup against them.
const demoProviders = [
  {
    npi: "1234567893",
    first_name: "Mark",
    last_name: "Douglas",
    credential: "MD",
    nppes_specialty: "Internal Medicine",
    nppes_practice_address: "100 Clinic Way, Aberdeen, SD, 57401",
    nppes_practice_phone: "6055551234",
    license_number: "SD-MD-445566",
    license_state: "SD",
    middle_name: "Allen",
    other_names: "N/A",
    titles: "MD",
    primary_service_location: "Aberdeen",
    first_day_date: "2019-06-01",
    home_address: "22 Oak St, Aberdeen, SD, 57401",
    personal_email: "mdouglas.personal@example.com",
    personal_phone: "6055559876",
    dob: "1980-04-12",
    city_of_birth: "Sioux Falls, SD",
    ssn: "000-00-0001",
    degrees: "MD",
    pcp_note: "Yes, wishes to be noted as PCP at MDHC",
    specialties: "Internal Medicine (primary)",
    age_range_treated: "18-100",
    opioid_treatment: "No",
    special_populations: "N/A",
    gender_for_directories: "Male",
    ethnicity_for_directories: "N/A",
    caqh_profile_number: "CAQH-8834451",
    caqh_username: "mdouglas_md",
    caqh_has_login: "yes",
    medicare_ptan_number: "SD12345",
    medicare_ptan_issued: "2019-07-01",
    medicare_ptan_expires: "",
    medicaid_number: "MCD-99881",
    medicaid_issued: "2019-07-15",
    medicaid_expires: "",
    railroad_medicare_number: "N/A",
    railroad_medicare_issued: "",
    railroad_medicare_expires: "",
    dea_number: "BD1234563",
    board_certification_number: "ABIM-778899",
    controlled_substance_number: "CS-556677",
    liability_ins_start: "2025-01-01",
    liability_ins_end: "2026-01-01",
    hospital_admitting_type: "Privileges",
    hospital_name: "Sanford Aberdeen Medical Center",
    hospital_address: "2905 3rd Ave SE, Aberdeen, SD, 57401",
    hospital_phone: "6056221000",
    self_reported_innetwork_payers: "Healthcare X, Sanford Health Plan",
  },
  {
    npi: "1112223330",
    first_name: "Priya",
    last_name: "Anand",
    credential: "DO",
    nppes_specialty: "Family Medicine",
    nppes_practice_address: "40 Main St, Brandon, SD, 57005",
    nppes_practice_phone: "6055554321",
    license_number: "SD-DO-119922",
    license_state: "SD",
    middle_name: "",
    other_names: "N/A",
    titles: "DO",
    primary_service_location: "Brandon",
    first_day_date: "2021-02-15",
    home_address: "8 Maple Ave, Brandon, SD, 57005",
    personal_email: "panand.personal@example.com",
    personal_phone: "6055551122",
    dob: "1985-09-23",
    city_of_birth: "Rapid City, SD",
    ssn: "000-00-0002",
    degrees: "DO",
    pcp_note: "Yes, wishes to be noted as PCP at MDHC",
    specialties: "Family Medicine (primary)",
    age_range_treated: "0-100",
    opioid_treatment: "No",
    special_populations: "LGBTQ+, homeless",
    gender_for_directories: "Female",
    ethnicity_for_directories: "N/A",
    caqh_profile_number: "CAQH-2210987",
    caqh_username: "panand_do",
    caqh_has_login: "yes",
    medicare_ptan_number: "SD55223",
    medicare_ptan_issued: "2021-03-01",
    medicare_ptan_expires: "",
    medicaid_number: "MCD-44120",
    medicaid_issued: "2021-03-10",
    medicaid_expires: "",
    railroad_medicare_number: "N/A",
    railroad_medicare_issued: "",
    railroad_medicare_expires: "",
    dea_number: "AA9876543",
    board_certification_number: "ABFM-334455",
    controlled_substance_number: "CS-889900",
    liability_ins_start: "2025-03-01",
    liability_ins_end: "2026-03-01",
    hospital_admitting_type: "No privileges — local ER",
    hospital_name: "Sanford Aberdeen Medical Center",
    hospital_address: "2905 3rd Ave SE, Aberdeen, SD, 57401",
    hospital_phone: "6056221000",
    self_reported_innetwork_payers: "",
  },
];

const insertProvider = db.prepare(`
  INSERT OR IGNORE INTO providers (
    npi, first_name, last_name, credential, nppes_specialty, nppes_practice_address,
    nppes_practice_phone, license_number, license_state, middle_name, other_names, titles,
    primary_service_location, first_day_date, home_address, personal_email, personal_phone,
    dob, city_of_birth, ssn, degrees, pcp_note, specialties, age_range_treated, opioid_treatment,
    special_populations, gender_for_directories, ethnicity_for_directories, caqh_profile_number,
    caqh_username, caqh_has_login, medicare_ptan_number, medicare_ptan_issued, medicare_ptan_expires,
    medicaid_number, medicaid_issued, medicaid_expires, railroad_medicare_number,
    railroad_medicare_issued, railroad_medicare_expires, dea_number, board_certification_number,
    controlled_substance_number, liability_ins_start, liability_ins_end, hospital_admitting_type,
    hospital_name, hospital_address, hospital_phone, self_reported_innetwork_payers
  ) VALUES (
    @npi, @first_name, @last_name, @credential, @nppes_specialty, @nppes_practice_address,
    @nppes_practice_phone, @license_number, @license_state, @middle_name, @other_names, @titles,
    @primary_service_location, @first_day_date, @home_address, @personal_email, @personal_phone,
    @dob, @city_of_birth, @ssn, @degrees, @pcp_note, @specialties, @age_range_treated, @opioid_treatment,
    @special_populations, @gender_for_directories, @ethnicity_for_directories, @caqh_profile_number,
    @caqh_username, @caqh_has_login, @medicare_ptan_number, @medicare_ptan_issued, @medicare_ptan_expires,
    @medicaid_number, @medicaid_issued, @medicaid_expires, @railroad_medicare_number,
    @railroad_medicare_issued, @railroad_medicare_expires, @dea_number, @board_certification_number,
    @controlled_substance_number, @liability_ins_start, @liability_ins_end, @hospital_admitting_type,
    @hospital_name, @hospital_address, @hospital_phone, @self_reported_innetwork_payers
  )
`);
for (const p of demoProviders) insertProvider.run(p);

const getPayerId = db.prepare("SELECT id FROM payers WHERE name = ?");
const getProviderId = db.prepare("SELECT id FROM providers WHERE npi = ?");
const insertSubmission = db.prepare(`
  INSERT OR IGNORE INTO payer_submissions
    (provider_id, payer_id, status, submitted_at, decided_at, effective_date, approved_through,
     evidence_file_name, evidence_file_path, evidence_file_mime, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertReference = db.prepare(`
  INSERT OR IGNORE INTO provider_references (provider_id, ref_number, name_title, phone, email, address)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertLocation = db.prepare(`
  INSERT INTO provider_practice_locations (provider_id, name_and_address, frequency, tax_id, start_date)
  VALUES (?, ?, ?, ?, ?)
`);
const insertDisclosure = db.prepare(`
  INSERT OR IGNORE INTO provider_disclosures (provider_id, question_key, answer, explanation)
  VALUES (?, ?, ?, ?)
`);

const mark = getProviderId.get("1234567893").id;
const priya = getProviderId.get("1112223330").id;
const healthcareX = getPayerId.get("Healthcare X").id;
const medicare = getPayerId.get("Medicare").id;
const medicaid = getPayerId.get("State Medicaid").id;
const blueShield = getPayerId.get("Blue Shield Regional").id;

function seedEvidenceFile(submissionLabel, label) {
  const storedName = `submission_${submissionLabel}_evidence_seed.txt`;
  fs.writeFileSync(
    path.join(uploadsDir, storedName),
    `Placeholder approval evidence for ${label}. Not a real screenshot/document.`
  );
  return storedName;
}

insertSubmission.run(
  mark,
  healthcareX,
  "approved",
  "2026-05-01 09:00:00",
  "2026-05-20 10:00:00",
  "2026-06-20",
  "2027-06-20",
  "healthcare-x-approval-email.txt",
  seedEvidenceFile("mark-healthcarex", "Mark Douglas / Healthcare X approval"),
  "text/plain",
  "Approval confirmed via forwarded payer email."
);
insertSubmission.run(
  mark,
  medicare,
  "pending",
  "2026-07-01 09:00:00",
  null,
  null,
  null,
  null,
  null,
  null,
  "Submission packet generated; awaiting payer decision."
);
insertSubmission.run(
  priya,
  healthcareX,
  "pending",
  "2026-07-10 09:00:00",
  null,
  null,
  null,
  null,
  null,
  null,
  "Submission packet generated; awaiting payer decision."
);
insertSubmission.run(
  priya,
  medicaid,
  "denied",
  "2026-04-01 09:00:00",
  "2026-04-25 10:00:00",
  null,
  null,
  null,
  null,
  null,
  "Denial confirmed via payer portal status."
);

insertReference.run(mark, 1, "Dr. Susan Reyes, MD", "6055550101", "sreyes@example.com", "Sanford Aberdeen Medical Center");
insertReference.run(mark, 2, "Dr. Tom Becker, MD", "6055550102", "tbecker@example.com", "100 Clinic Way, Aberdeen, SD");
insertReference.run(mark, 3, "Dr. Lin Chao, DO", "6055550103", "lchao@example.com", "Huron Family Practice");

insertReference.run(priya, 1, "Dr. Amy Fields, MD", "6055550201", "afields@example.com", "Sanford Aberdeen Medical Center");
insertReference.run(priya, 2, "Dr. Raj Patel, DO", "6055550202", "rpatel@example.com", "40 Main St, Brandon, SD");
insertReference.run(priya, 3, "Dr. Kevin Okafor, MD", "6055550203", "kokafor@example.com", "Sioux Falls Family Health");

insertLocation.run(priya, "Huron Community Clinic, 12 2nd St, Huron, SD 57350", "monthly", "TBD", "2022-01-10");

insertDisclosure.run(mark, "cultural_training", "yes", "Completed MDHC cultural competency training, March 2024.");
insertDisclosure.run(priya, "related_to_owner", "no", "");

const insertLob = db.prepare("INSERT OR IGNORE INTO lines_of_business (payer_id, name) VALUES (?, ?)");
const insertPlan = db.prepare("INSERT OR IGNORE INTO plans (line_of_business_id, name) VALUES (?, ?)");
const getLobId = db.prepare("SELECT id FROM lines_of_business WHERE payer_id = ? AND name = ?");
const getPlanId = db.prepare("SELECT id FROM plans WHERE line_of_business_id = ? AND name = ?");
const insertNetworkStatus = db.prepare(`
  INSERT OR IGNORE INTO network_statuses
    (provider_id, plan_id, status, confirmation_source, effective_date, recorded_at,
     evidence_file_name, evidence_file_path, evidence_file_mime, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function seedNetworkEvidenceFile(providerId, planId, label) {
  const storedName = `network_${providerId}_${planId}_seed.txt`;
  fs.writeFileSync(
    path.join(uploadsDir, storedName),
    `Placeholder confirmation proof for ${label}. Not a real screenshot/document.`
  );
  return storedName;
}

insertLob.run(healthcareX, "Commercial");
insertPlan.run(getLobId.get(healthcareX, "Commercial").id, "HX Gold PPO");
insertPlan.run(getLobId.get(healthcareX, "Commercial").id, "HX Silver HMO");

insertLob.run(medicare, "Medicare Advantage");
insertPlan.run(getLobId.get(medicare, "Medicare Advantage").id, "MA Choice Plus");

insertLob.run(medicaid, "Medicaid Managed Care");
insertPlan.run(getLobId.get(medicaid, "Medicaid Managed Care").id, "SD Medicaid MCO");

const hxCommercial = getLobId.get(healthcareX, "Commercial").id;
const hxGoldPpo = getPlanId.get(hxCommercial, "HX Gold PPO").id;
const medicaidMcoLob = getLobId.get(medicaid, "Medicaid Managed Care").id;
const sdMedicaidMco = getPlanId.get(medicaidMcoLob, "SD Medicaid MCO").id;

insertNetworkStatus.run(
  mark,
  hxGoldPpo,
  "in_network",
  "payer_portal",
  "2026-06-20",
  "2026-07-10 09:00:00",
  "healthcare-x-portal-screenshot.txt",
  seedNetworkEvidenceFile(mark, hxGoldPpo, "Mark Douglas / Healthcare X Gold PPO"),
  "text/plain",
  "Confirmed via Healthcare X provider portal after approval."
);
insertNetworkStatus.run(
  priya,
  sdMedicaidMco,
  "not_in_network",
  "email",
  null,
  "2026-04-25 10:00:00",
  "sd-medicaid-denial-email.txt",
  seedNetworkEvidenceFile(priya, sdMedicaidMco, "Priya Anand / SD Medicaid MCO"),
  "text/plain",
  "Application denied; not listed in SD Medicaid MCO directory."
);

const insertDocument = db.prepare(`
  INSERT OR IGNORE INTO provider_documents
    (provider_id, document_type, status, file_name, file_path, file_mime, uploaded_at, issued_date, expires_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function seedDummyFile(providerId, documentType, label) {
  const storedName = `${providerId}_${documentType}_seed.txt`;
  fs.writeFileSync(
    path.join(uploadsDir, storedName),
    `Placeholder demo file for ${label}. Not a real document.`
  );
  return storedName;
}

insertDocument.run(
  mark,
  "medical_license",
  "on_file",
  "mark-douglas-medical-license.txt",
  seedDummyFile(mark, "medical_license", "Mark Douglas medical license"),
  "text/plain",
  "2020-01-15T00:00:00.000Z",
  "2020-01-01",
  "2027-01-01",
  null
);
insertDocument.run(
  mark,
  "dea_certificate",
  "on_file",
  "mark-douglas-dea.txt",
  seedDummyFile(mark, "dea_certificate", "Mark Douglas DEA certificate"),
  "text/plain",
  "2023-08-05T00:00:00.000Z",
  "2023-08-01",
  "2026-08-15",
  "Expiring soon — renewal packet due to DEA."
);
insertDocument.run(mark, "board_certification", "on_caqh", null, null, null, null, null, "2028-01-01", null);

insertDocument.run(
  priya,
  "liability_insurance",
  "on_file",
  "priya-anand-liability-insurance.txt",
  seedDummyFile(priya, "liability_insurance", "Priya Anand liability insurance"),
  "text/plain",
  "2024-03-01T00:00:00.000Z",
  "2024-03-01",
  "2026-03-01",
  "Expired — needs renewed certificate from carrier."
);
insertDocument.run(priya, "drivers_license", "on_caqh", null, null, null, null, null, null, null);

const insertFieldLabel = db.prepare(`
  INSERT OR IGNORE INTO payer_field_labels (payer_id, field_key, label, included)
  VALUES (?, ?, ?, ?)
`);
insertFieldLabel.run(healthcareX, "npi", "Provider NPI Number", 1);
insertFieldLabel.run(healthcareX, "ssn", "Tax ID / SSN", 1);
insertFieldLabel.run(healthcareX, "home_address", "Residential Address", 1);
insertFieldLabel.run(healthcareX, "personal_phone", "Contact Phone", 1);
insertFieldLabel.run(healthcareX, "railroad_medicare_number", "", 0);
insertFieldLabel.run(medicaid, "npi", "National Provider Identifier", 1);
insertFieldLabel.run(medicaid, "medicaid_number", "SD Medicaid Provider #", 1);

// Medica Health Plans mirrors the real MN Uniform Credentialing Application the
// client has used with providers, relabeled to match its exact field wording.
// The "gap_*" fields represent sections that form asks for (education, training,
// employment history, license status, billing, life support certs) that we don't
// collect anywhere yet — included here so the generated packet shows the gap
// explicitly, and excluded from every other payer so their packets are unaffected.
const medica = getPayerId.get("Medica Health Plans").id;

const MEDICA_RELABELED_FIELDS = {
  npi: "NPI",
  first_name: "First Name",
  middle_name: "Middle",
  last_name: "Last",
  other_names: "All Former Aliases",
  titles: "Title",
  degrees: "Degree(s) Received",
  credential: "Suffix",
  dob: "Date of Birth",
  city_of_birth: "Birthplace City",
  ssn: "Social Security Number",
  home_address: "Current Home Address",
  personal_email: "E-mail Address",
  personal_phone: "Cell Phone Number",
  primary_service_location: "Primary Practice Location/Clinic Name",
  first_day_date: "Start Date (at this location)",
  specialties: "Primary Specialty in which Care will be Provided",
  nppes_practice_address: "Primary Practice Location Address",
  nppes_practice_phone: "Office Phone Number (Primary Practice)",
  gender_for_directories: "Gender",
  ethnicity_for_directories: "Ethnicity (select all that apply)",
  caqh_profile_number: "CAQH ID",
  license_number: "License Number",
  license_state: "License State",
  dea_number: "DEA Number",
  board_certification_number: "Certificate Number (Primary Specialty)",
  controlled_substance_number: "State Controlled Substance Certification/Registration Number",
  liability_ins_start: "Coverage Start Date (Current Policy)",
  liability_ins_end: "Coverage Expiration Date (Current Policy)",
  hospital_admitting_type: "Type/Category of Privilege or Affiliation",
  hospital_name: "Primary Hospital Affiliation – Facility Name",
  hospital_address: "Primary Hospital Affiliation – Facility Address",
  hospital_phone: "Primary Hospital Affiliation – Phone Number",
};

const MEDICA_EXCLUDED_FIELDS = [
  "nppes_specialty",
  "pcp_note",
  "age_range_treated",
  "opioid_treatment",
  "special_populations",
  "caqh_username",
  "medicare_ptan_number",
  "medicare_ptan_issued",
  "medicare_ptan_expires",
  "medicaid_number",
  "medicaid_issued",
  "medicaid_expires",
  "railroad_medicare_number",
];

const MEDICA_GAP_FIELDS = {
  gap_edu_level: "Education Level (Undergraduate/Masters/PhD/Medical/Dental/Other)",
  gap_edu_institution: "Institution Name",
  gap_edu_dates: "Attendance Dates (From/To)",
  gap_edu_degree: "Degree Received",
  gap_edu_area_of_study: "Area of Study",
  gap_edu_address: "Institution Address",
  gap_edu_phone: "Institution Phone Number",
  gap_edu_email: "Institution E-mail Address",
  gap_edu_ecfmg: "ECFMG Number (if applicable)",
  gap_training_institution: "Training Institution Name",
  gap_training_program_type: "Type of Program/Specialty",
  gap_training_dates: "Training Dates (From/To)",
  gap_training_completed: "Completed Training? (Yes/No)",
  gap_training_program_director: "Program Director",
  gap_training_address: "Training Institution Address",
  gap_training_phone: "Training Institution Phone Number",
  gap_employment_organization: "Organization Name",
  gap_employment_title: "Title/Position",
  gap_employment_dates: "Employment Dates (From/To)",
  gap_employment_reason_leaving: "Reason for Leaving",
  gap_employment_still_open: "Clinic Still Open? (Yes/No)",
  gap_employment_contact: "Employment Verification Contact",
  gap_employment_address: "Employer Address",
  gap_license_type: "License Type",
  gap_license_date_issued: "License Date Issued",
  gap_license_expiration: "License Expiration Date",
  gap_license_status: "License Status (Active/Inactive/Pending)",
  gap_billing_name: "Billing Name",
  gap_billing_contact_person: "Billing Contact Person",
  gap_billing_address: "Billing Address",
  gap_billing_phone: "Billing Office Phone Number",
  gap_billing_fax: "Billing Fax Number",
  gap_billing_email: "Billing E-mail Address",
  gap_life_support_has_certs: "Current Life Support Certifications? (Yes/No)",
  gap_life_support_types: "Type(s) of Certification (BLS/ACLS/ATLS/PALS/NRP, etc.)",
  gap_life_support_expiration: "Certification Expiration Date(s)",
};

for (const [key, label] of Object.entries(MEDICA_RELABELED_FIELDS)) {
  insertFieldLabel.run(medica, key, label, 1);
}
for (const key of MEDICA_EXCLUDED_FIELDS) {
  insertFieldLabel.run(medica, key, "", 0);
}
for (const [key, label] of Object.entries(MEDICA_GAP_FIELDS)) {
  insertFieldLabel.run(medica, key, label, 1);
}
for (const otherPayer of [healthcareX, medicare, medicaid, blueShield]) {
  for (const key of Object.keys(MEDICA_GAP_FIELDS)) {
    insertFieldLabel.run(otherPayer, key, "", 0);
  }
}

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (email, password_hash, role, provider_id)
  VALUES (?, ?, ?, ?)
`);
const ADMIN_EMAIL = "admin@mdhc-llc.com";
const ADMIN_PASSWORD = "admin12345";
insertUser.run(ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD), "admin", null);

const DEMO_EMAIL = "demo@nxtpi.com";
const DEMO_PASSWORD = "demo12345";
insertUser.run(DEMO_EMAIL, hashPassword(DEMO_PASSWORD), "admin", null);

console.log(
  "Seeded payers, 2 demo providers (with locations/references/disclosures), sample submissions with approval evidence, network status tree, documents, and payer field labels."
);
console.log(`\nDemo admin login:\n  email: ${ADMIN_EMAIL}\n  password: ${ADMIN_PASSWORD}`);
console.log(`\nDemo admin login:\n  email: ${DEMO_EMAIL}\n  password: ${DEMO_PASSWORD}`);
