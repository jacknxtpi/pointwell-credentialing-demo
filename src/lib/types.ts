export type Provider = {
  id: number;
  npi: string;
  first_name: string;
  last_name: string;
  credential: string | null;
  provider_type: string | null;
  primary_practice_address: string | null;
  primary_practice_phone: string | null;
  work_email: string | null;
  home_address: string | null;
  medicare_ptan_individual: string | null;
  medicare_ptan_reassignment: string | null;
  medicaid_ptan_individual: string | null;
  license_number: string | null;
  license_state: string | null;
  dea_number: string | null;
  board_certification_number: string | null;
  controlled_substance_number: string | null;
  caqh_number: string | null;
  liability_ins_start: string | null;
  liability_ins_end: string | null;
  dob: string | null;
  ssn: string | null;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
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
  notes: string | null;
};
