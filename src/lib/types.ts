export type Provider = {
  id: number;
  npi: string;

  first_name: string;
  last_name: string;
  credential: string | null;
  nppes_specialty: string | null;
  nppes_practice_address: string | null;
  nppes_practice_phone: string | null;
  license_number: string | null;
  license_state: string | null;

  middle_name: string | null;
  other_names: string | null;
  titles: string | null;
  primary_service_location: string | null;
  first_day_date: string | null;
  home_address: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  dob: string | null;
  city_of_birth: string | null;
  ssn: string | null;
  degrees: string | null;
  pcp_note: string | null;
  specialties: string | null;
  age_range_treated: string | null;
  opioid_treatment: string | null;
  special_populations: string | null;
  gender_for_directories: string | null;
  ethnicity_for_directories: string | null;

  caqh_profile_number: string | null;
  caqh_username: string | null;
  caqh_has_login: string | null;

  medicare_ptan_number: string | null;
  medicare_ptan_issued: string | null;
  medicare_ptan_expires: string | null;
  medicaid_number: string | null;
  medicaid_issued: string | null;
  medicaid_expires: string | null;
  railroad_medicare_number: string | null;
  railroad_medicare_issued: string | null;
  railroad_medicare_expires: string | null;

  dea_number: string | null;
  board_certification_number: string | null;
  controlled_substance_number: string | null;
  liability_ins_start: string | null;
  liability_ins_end: string | null;

  hospital_admitting_type: string | null;
  hospital_name: string | null;
  hospital_address: string | null;
  hospital_phone: string | null;

  self_reported_innetwork_payers: string | null;

  created_at: string;
  updated_at: string;
};

export type PracticeLocation = {
  id: number;
  provider_id: number;
  name_and_address: string;
  frequency: string | null;
  tax_id: string | null;
  start_date: string | null;
};

export type Reference = {
  id: number;
  provider_id: number;
  ref_number: number;
  name_title: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type Disclosure = {
  id: number;
  provider_id: number;
  question_key: string;
  answer: string | null;
  explanation: string | null;
};

export type Payer = {
  id: number;
  name: string;
  payer_type: string;
};

export type SubmissionStatus = "submitted" | "pending" | "approved" | "denied" | "terminated";

export type PayerSubmission = {
  id: number;
  provider_id: number;
  payer_id: number;
  status: SubmissionStatus;
  submitted_at: string;
  decided_at: string | null;
  effective_date: string | null;
  approved_through: string | null;
  evidence_file_name: string | null;
  evidence_file_path: string | null;
  evidence_file_mime: string | null;
  notes: string | null;
};

export type PayerFieldLabel = {
  id: number;
  payer_id: number;
  field_key: string;
  label: string;
  included: number;
};

export type LineOfBusiness = {
  id: number;
  payer_id: number;
  name: string;
};

export type Plan = {
  id: number;
  line_of_business_id: number;
  name: string;
};

export type NetworkStatusValue = "in_network" | "not_in_network";

export type ConfirmationSource = "email" | "payer_portal" | "public_directory" | "phone_follow_up";

export type NetworkStatus = {
  id: number;
  provider_id: number;
  plan_id: number;
  status: NetworkStatusValue;
  confirmation_source: ConfirmationSource | null;
  effective_date: string | null;
  last_verified_date: string | null;
  notes: string | null;
};

export type ProviderDocument = {
  id: number;
  provider_id: number;
  document_type: string;
  status: "on_file" | "on_caqh";
  file_name: string | null;
  file_path: string | null;
  file_mime: string | null;
  uploaded_at: string | null;
  issued_date: string | null;
  expires_date: string | null;
  notes: string | null;
};
