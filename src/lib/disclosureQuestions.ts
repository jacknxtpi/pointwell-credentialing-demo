export type DisclosureQuestion = {
  key: string;
  section: string;
  label: string;
};

export const DISCLOSURE_QUESTIONS: DisclosureQuestion[] = [
  {
    key: "license_action",
    section: "Denied, revoked, suspended, limited, or placed on probation (voluntarily or involuntarily) in any state",
    label: "Medical or professional license?",
  },
  {
    key: "hospital_privileges_action",
    section: "Denied, revoked, suspended, limited, or placed on probation (voluntarily or involuntarily) in any state",
    label: "Hospital medical staff privileges?",
  },
  {
    key: "military_action",
    section: "Denied, revoked, suspended, limited, or placed on probation (voluntarily or involuntarily) in any state",
    label: "Military?",
  },
  {
    key: "mco_action",
    section: "Denied, revoked, suspended, limited, or placed on probation (voluntarily or involuntarily) in any state",
    label: "MCO?",
  },
  {
    key: "convicted_criminal",
    section: "At any time, have you ever been",
    label: "Convicted of a criminal offense?",
  },
  {
    key: "convicted_felony",
    section: "At any time, have you ever been",
    label: "Convicted of a felony?",
  },
  {
    key: "convicted_misdemeanor_health",
    section: "At any time, have you ever been",
    label: "Convicted of a misdemeanor related to a health profession?",
  },
  {
    key: "under_indictment",
    section: "Have you ever at any time or are you currently",
    label: "Under indictment for any crime?",
  },
  {
    key: "subject_of_investigation",
    section: "Have you ever at any time or are you currently",
    label: "The subject of an investigation by any private, federal, or state insurance program or licensing board?",
  },
  {
    key: "subject_of_adverse_action",
    section: "Have you ever at any time or are you currently",
    label: "The subject of any adverse action reports to a state or federal databank?",
  },
  {
    key: "withdrawn_medical_staff_app",
    section: "Have you ever either voluntarily or involuntarily",
    label: "Withdrawn your application for medical staff membership at a facility?",
  },
  {
    key: "withdrawn_privileges_request",
    section: "Have you ever either voluntarily or involuntarily",
    label: "Withdrawn your request for clinical privileges at any facility?",
  },
  {
    key: "liability_insurance_cancelled",
    section: "Professional liability history",
    label: "Has your liability insurance ever been canceled or denied?",
  },
  {
    key: "malpractice_judgments",
    section: "Professional liability history",
    label: "Do you have any malpractice judgments against you (including arbitration)?",
  },
  {
    key: "claim_settlements",
    section: "Professional liability history",
    label: "Have you had any claim settlements not involving litigation or arbitration paid by you or on your behalf?",
  },
  {
    key: "pending_malpractice_defendant",
    section: "Professional liability history",
    label: "Are you now a defendant in a pending malpractice suit?",
  },
  {
    key: "related_to_owner",
    section: "Miscellaneous",
    label: "Are you related to any owners of the practice? What is the relationship (include extended family like in-law)?",
  },
  {
    key: "cultural_training",
    section: "Miscellaneous",
    label: "Have you had Cultural Training? When?",
  },
];
