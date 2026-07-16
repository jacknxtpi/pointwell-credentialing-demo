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
