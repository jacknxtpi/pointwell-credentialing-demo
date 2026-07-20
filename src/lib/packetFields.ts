import type { Provider } from "./types";

export type PacketField = {
  key: string;
  label: string;
  getValue: (provider: Provider) => string | null;
};

const field = (key: keyof Provider, label: string): PacketField => ({
  key,
  label,
  getValue: (provider) => {
    const v = provider[key];
    return v === null || v === undefined || v === "" ? null : String(v);
  },
});

export const PACKET_FIELDS: PacketField[] = [
  field("npi", "NPI"),
  field("first_name", "First name"),
  field("middle_name", "Middle name"),
  field("last_name", "Last name"),
  field("other_names", "Other names (maiden, legal)"),
  field("titles", "Titles"),
  field("degrees", "Degrees"),
  field("credential", "Credential"),
  field("dob", "Date of birth"),
  field("city_of_birth", "City of birth"),
  field("ssn", "SSN"),
  field("home_address", "Home address"),
  field("personal_email", "Personal email"),
  field("personal_phone", "Personal phone"),
  field("primary_service_location", "Primary service location"),
  field("first_day_date", "First day providing services"),
  field("specialties", "Specialties"),
  field("nppes_specialty", "NPPES specialty"),
  field("nppes_practice_address", "Practice address"),
  field("nppes_practice_phone", "Practice phone"),
  field("pcp_note", "PCP designation"),
  field("age_range_treated", "Age range treated"),
  field("opioid_treatment", "Opioid treatment"),
  field("special_populations", "Special patient populations"),
  field("gender_for_directories", "Gender (directories)"),
  field("ethnicity_for_directories", "Ethnicity (directories)"),
  field("caqh_profile_number", "CAQH profile number"),
  field("caqh_username", "CAQH username"),
  field("license_number", "License number"),
  field("license_state", "License state"),
  field("dea_number", "DEA number"),
  field("board_certification_number", "Board certification number"),
  field("controlled_substance_number", "Controlled substance number"),
  field("medicare_ptan_number", "Medicare PTAN"),
  field("medicare_ptan_issued", "Medicare PTAN issued"),
  field("medicare_ptan_expires", "Medicare PTAN expires"),
  field("medicaid_number", "Medicaid number"),
  field("medicaid_issued", "Medicaid issued"),
  field("medicaid_expires", "Medicaid expires"),
  field("railroad_medicare_number", "Railroad Medicare number"),
  field("liability_ins_start", "Liability insurance start"),
  field("liability_ins_end", "Liability insurance end"),
  field("hospital_admitting_type", "Hospital admitting type"),
  field("hospital_name", "Hospital name"),
  field("hospital_address", "Hospital address"),
  field("hospital_phone", "Hospital phone"),
];

// Sections some payer applications ask for that we don't collect anywhere yet.
// Broken out to the same sub-field granularity as the source form (rather than
// one summary line per section) so the generated packet shows exactly which
// questions are unanswered. Included only for payers whose form actually asks
// for them.
const gap = (key: string, label: string): PacketField => ({ key, label, getValue: () => null });

export const GAP_FIELDS: PacketField[] = [
  // Medical/Graduate/Professional Education
  gap("gap_edu_level", "Education level (undergraduate/masters/PhD/medical/dental/other)"),
  gap("gap_edu_institution", "Education — institution name"),
  gap("gap_edu_dates", "Education — attendance dates (from/to)"),
  gap("gap_edu_degree", "Education — degree received"),
  gap("gap_edu_area_of_study", "Education — area of study"),
  gap("gap_edu_address", "Education — institution address"),
  gap("gap_edu_phone", "Education — institution phone number"),
  gap("gap_edu_email", "Education — institution e-mail address"),
  gap("gap_edu_ecfmg", "ECFMG number (if applicable)"),

  // Internship/Residency/Fellowship Training
  gap("gap_training_institution", "Training — institution name"),
  gap("gap_training_program_type", "Training — type of program/specialty"),
  gap("gap_training_dates", "Training — dates (from/to)"),
  gap("gap_training_completed", "Training — completed? (yes/no)"),
  gap("gap_training_program_director", "Training — program director"),
  gap("gap_training_address", "Training — institution address"),
  gap("gap_training_phone", "Training — institution phone number"),

  // Chronological Employment/Practice History
  gap("gap_employment_organization", "Employment history — organization name"),
  gap("gap_employment_title", "Employment history — title/position"),
  gap("gap_employment_dates", "Employment history — dates (from/to)"),
  gap("gap_employment_reason_leaving", "Employment history — reason for leaving"),
  gap("gap_employment_still_open", "Employment history — clinic still open? (yes/no)"),
  gap("gap_employment_contact", "Employment history — verification contact"),
  gap("gap_employment_address", "Employment history — employer address"),

  // Licensure detail beyond number/state
  gap("gap_license_type", "License type"),
  gap("gap_license_date_issued", "License date issued"),
  gap("gap_license_expiration", "License expiration date"),
  gap("gap_license_status", "License status (active/inactive/pending)"),

  // Billing Information
  gap("gap_billing_name", "Billing name"),
  gap("gap_billing_contact_person", "Billing contact person"),
  gap("gap_billing_address", "Billing address"),
  gap("gap_billing_phone", "Billing office phone number"),
  gap("gap_billing_fax", "Billing fax number"),
  gap("gap_billing_email", "Billing e-mail address"),

  // Life Support Certification
  gap("gap_life_support_has_certs", "Current life support certifications? (yes/no)"),
  gap("gap_life_support_types", "Life support certification type(s) (BLS/ACLS/ATLS/PALS/NRP, etc.)"),
  gap("gap_life_support_expiration", "Life support certification expiration date(s)"),
];

PACKET_FIELDS.push(...GAP_FIELDS);
