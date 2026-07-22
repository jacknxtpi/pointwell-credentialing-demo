import { PROVIDER_COLUMNS } from "./providerColumns";

export type ImportField = {
  key: string;
  label: string;
  aliases: string[];
  required?: boolean;
};

const FIELD_META: Record<string, { label: string; aliases: string[]; required?: boolean }> = {
  npi: { label: "NPI", aliases: ["npi number", "national provider identifier"], required: true },
  first_name: { label: "First name", aliases: ["fname", "given name"], required: true },
  last_name: { label: "Last name", aliases: ["lname", "surname", "family name"], required: true },
  credential: { label: "Credential", aliases: ["suffix", "designation"] },
  nppes_specialty: { label: "NPPES specialty", aliases: ["specialty"] },
  nppes_practice_address: { label: "NPPES practice address", aliases: ["practice address"] },
  nppes_practice_phone: { label: "NPPES practice phone", aliases: ["practice phone"] },
  license_number: { label: "License number", aliases: ["license #", "license no"] },
  license_state: { label: "License state", aliases: [] },
  middle_name: { label: "Middle name", aliases: ["mname", "middle initial"] },
  other_names: { label: "Other names (maiden, legal)", aliases: ["aliases", "maiden name"] },
  titles: { label: "Titles", aliases: ["credentials", "designations"] },
  primary_service_location: { label: "Primary service location", aliases: ["location", "site", "clinic"] },
  first_day_date: { label: "First day providing services", aliases: ["start date", "hire date"] },
  home_address: { label: "Home address", aliases: ["address", "residential address"] },
  personal_email: { label: "Personal email", aliases: ["email"] },
  personal_phone: { label: "Personal phone", aliases: ["phone", "cell phone", "phone number"] },
  dob: { label: "Date of birth", aliases: ["birth date", "birthdate"] },
  city_of_birth: { label: "City of birth", aliases: ["birthplace"] },
  ssn: { label: "SSN", aliases: ["social security number", "social security"] },
  degrees: { label: "Degrees", aliases: [] },
  pcp_note: { label: "PCP designation note", aliases: ["pcp"] },
  specialties: { label: "Specialties", aliases: ["specialty"] },
  age_range_treated: { label: "Age range treated", aliases: ["ages treated"] },
  opioid_treatment: { label: "Opioid treatment", aliases: [] },
  special_populations: { label: "Special patient populations", aliases: [] },
  gender_for_directories: { label: "Gender (directories)", aliases: ["gender", "sex"] },
  ethnicity_for_directories: { label: "Ethnicity (directories)", aliases: ["ethnicity"] },
  caqh_profile_number: { label: "CAQH profile number", aliases: ["caqh id", "caqh number", "caqh #"] },
  caqh_username: { label: "CAQH username", aliases: [] },
  caqh_has_login: { label: "Has CAQH login", aliases: ["caqh login"] },
  medicare_ptan_number: { label: "Medicare PTAN", aliases: ["ptan", "medicare ptan number"] },
  medicare_ptan_issued: { label: "Medicare PTAN issued", aliases: [] },
  medicare_ptan_expires: { label: "Medicare PTAN expires", aliases: [] },
  medicaid_number: { label: "Medicaid number", aliases: ["medicaid #", "medicaid id"] },
  medicaid_issued: { label: "Medicaid issued", aliases: [] },
  medicaid_expires: { label: "Medicaid expires", aliases: [] },
  railroad_medicare_number: { label: "Railroad Medicare number", aliases: ["railroad medicare #"] },
  railroad_medicare_issued: { label: "Railroad Medicare issued", aliases: [] },
  railroad_medicare_expires: { label: "Railroad Medicare expires", aliases: [] },
  dea_number: { label: "DEA number", aliases: ["dea #", "dea"] },
  board_certification_number: { label: "Board certification number", aliases: ["board cert #"] },
  controlled_substance_number: { label: "Controlled substance number", aliases: ["cs number", "cds number"] },
  liability_ins_start: { label: "Liability insurance start", aliases: ["malpractice start"] },
  liability_ins_end: { label: "Liability insurance end", aliases: ["malpractice end", "malpractice expiration"] },
  hospital_admitting_type: { label: "Hospital admitting type", aliases: ["admitting privileges"] },
  hospital_name: { label: "Hospital name", aliases: [] },
  hospital_address: { label: "Hospital address", aliases: [] },
  hospital_phone: { label: "Hospital phone", aliases: [] },
  self_reported_innetwork_payers: { label: "Self-reported in-network payers", aliases: ["in-network payers"] },
};

export const PROVIDER_IMPORT_FIELDS: ImportField[] = PROVIDER_COLUMNS.map((key) => ({
  key,
  label: FIELD_META[key]?.label ?? key,
  aliases: FIELD_META[key]?.aliases ?? [],
  required: FIELD_META[key]?.required ?? false,
}));

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Suggests one of our field keys for a CSV column header, given the set of
// field keys already claimed by an earlier column (so two CSV columns never
// get auto-mapped to the same field). Exact matches (key/label/alias) win
// over substring matches.
export function suggestMapping(header: string, alreadyUsed: Set<string>): string | null {
  const normalizedHeader = normalize(header);
  if (!normalizedHeader) return null;

  const candidatesFor = (f: ImportField) => [f.key, f.label, ...f.aliases].map(normalize);

  for (const f of PROVIDER_IMPORT_FIELDS) {
    if (alreadyUsed.has(f.key)) continue;
    if (candidatesFor(f).includes(normalizedHeader)) return f.key;
  }
  for (const f of PROVIDER_IMPORT_FIELDS) {
    if (alreadyUsed.has(f.key)) continue;
    if (candidatesFor(f).some((c) => c.length > 2 && (normalizedHeader.includes(c) || c.includes(normalizedHeader)))) {
      return f.key;
    }
  }
  return null;
}
