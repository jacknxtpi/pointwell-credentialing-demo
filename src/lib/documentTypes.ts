export type DocumentTypeDef = {
  key: string;
  label: string;
};

export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  { key: "board_certification", label: "Certification / Recertification / Board Certification" },
  { key: "drivers_license", label: "Driver's License (front and back)" },
  { key: "cv_resume", label: "Curriculum Vitae or Resume" },
  { key: "medical_license", label: "Medical License" },
  { key: "dea_certificate", label: "DEA Certificate" },
  { key: "liability_insurance", label: "Professional Liability Insurance" },
  { key: "cme_certificates", label: "Continuing Medical Education Certificates" },
];

export type ExpirationState = "missing" | "expired" | "expiring_soon" | "current" | "on_caqh";

export function getExpirationState(
  status: string | undefined,
  expiresDate: string | null | undefined
): ExpirationState {
  if (!status) return "missing";
  if (status === "on_caqh") return "on_caqh";
  if (!expiresDate) return "current";
  const today = new Date();
  const expires = new Date(expiresDate);
  const daysUntilExpiry = (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 60) return "expiring_soon";
  return "current";
}

export const EXPIRATION_STYLES: Record<ExpirationState, string> = {
  missing: "bg-slate-100 text-slate-500",
  expired: "bg-red-100 text-red-800",
  expiring_soon: "bg-amber-100 text-amber-800",
  current: "bg-brand-teal-light text-brand-teal",
  on_caqh: "bg-brand-blue-light text-brand-blue",
};

export const EXPIRATION_LABELS: Record<ExpirationState, string> = {
  missing: "missing",
  expired: "expired",
  expiring_soon: "expiring soon",
  current: "current",
  on_caqh: "on CAQH",
};
