// Payer credentialing isn't a one-time approval — most payers require
// recredentialing every 2-3 years. We already collect "approved_through" as
// part of the manual-entry approval flow, which for most payers *is* the
// recredentialing due date, so this reuses that field rather than adding a
// new one.
export type RecredentialingState = "overdue" | "due_soon" | "no_date" | "current" | "not_applicable";

const DUE_SOON_DAYS = 90;

export function getRecredentialingState(
  status: string,
  approvedThrough: string | null | undefined
): RecredentialingState {
  if (status !== "approved") return "not_applicable";
  if (!approvedThrough) return "no_date";
  const today = new Date();
  const dueDate = new Date(approvedThrough);
  const daysUntilDue = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= DUE_SOON_DAYS) return "due_soon";
  return "current";
}

export const RECRED_STYLES: Record<RecredentialingState, string> = {
  overdue: "bg-red-100 text-red-800",
  due_soon: "bg-amber-100 text-amber-800",
  no_date: "bg-slate-100 text-slate-500",
  current: "bg-brand-teal-light text-brand-teal",
  not_applicable: "bg-slate-100 text-slate-400",
};

export const RECRED_LABELS: Record<RecredentialingState, string> = {
  overdue: "recredentialing overdue",
  due_soon: "recredentialing due soon",
  no_date: "no recredentialing date on file",
  current: "current",
  not_applicable: "not yet approved",
};
