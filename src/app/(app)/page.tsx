import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";
import { DOCUMENT_TYPES, getExpirationState } from "@/lib/documentTypes";

const STALE_SUBMISSION_DAYS = 14;

type DocumentAlertRow = {
  provider_id: number;
  first_name: string;
  last_name: string;
  document_type: string;
  status: string;
  expires_date: string | null;
};

type SubmissionAlertRow = {
  id: number;
  provider_id: number;
  first_name: string;
  last_name: string;
  payer_name: string;
  status: string;
  submitted_at: string;
};

function getDocumentAlerts() {
  const rows = db
    .prepare(
      `SELECT d.provider_id, p.first_name, p.last_name, d.document_type, d.status, d.expires_date
       FROM provider_documents d
       JOIN providers p ON p.id = d.provider_id`
    )
    .all() as DocumentAlertRow[];

  const alerts = rows
    .map((row) => ({
      row,
      state: getExpirationState(row.status, row.expires_date),
      docLabel: DOCUMENT_TYPES.find((t) => t.key === row.document_type)?.label ?? row.document_type,
    }))
    .filter((a) => a.state === "expired" || a.state === "expiring_soon")
    .sort((a, b) => (a.row.expires_date ?? "").localeCompare(b.row.expires_date ?? ""));

  return alerts;
}

function getSubmissionAlerts() {
  const rows = db
    .prepare(
      `SELECT s.id, s.provider_id, p.first_name, p.last_name, pay.name AS payer_name, s.status, s.submitted_at
       FROM payer_submissions s
       JOIN providers p ON p.id = s.provider_id
       JOIN payers pay ON pay.id = s.payer_id
       WHERE s.status IN ('submitted', 'pending')
       ORDER BY s.submitted_at ASC`
    )
    .all() as SubmissionAlertRow[];

  const cutoff = Date.now() - STALE_SUBMISSION_DAYS * 24 * 60 * 60 * 1000;
  return rows
    .map((row) => ({
      row,
      daysPending: Math.floor((Date.now() - new Date(row.submitted_at).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter((a) => new Date(a.row.submitted_at).getTime() < cutoff);
}

const cards = [
  {
    href: "/providers/new",
    title: "Look up & add a provider",
    body: "Pull a provider's basic info from the real NPPES NPI Registry, then fill in the rest of the intake form.",
  },
  {
    href: "/providers",
    title: "Generate a submission packet",
    body: "Auto-populate a provider's data using a payer's own field labels. Downloading it registers the application as pending.",
  },
  {
    href: "/providers",
    title: "Record payer decisions",
    body: "Manually enter what a payer responds with — approval requires uploaded evidence and an approved-through date.",
  },
  {
    href: "/network",
    title: "Track network status",
    body: "Payer → line of business → plan, gradually filled in as it's confirmed through contracts and directory research.",
  },
  {
    href: "/documents",
    title: "Manage documents",
    body: "Upload required credentialing documents and get flagged on anything expired or expiring soon.",
  },
  {
    href: "/lookup",
    title: "Check status",
    body: 'Answer "Is Dr. X approved under Payer Y?" instantly from tracked submission status.',
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user?.role === "provider") {
    redirect("/my");
  }

  const documentAlerts = getDocumentAlerts();
  const submissionAlerts = getSubmissionAlerts();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Provider Credentialing Demo
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          NPI-based lookup, payer submission packets, network status tracking, and document
          expirations. Data here is for demonstration only — do not enter real SSNs, DOBs, or DEA
          numbers for real people.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-brand-navy">Documents needing attention</h2>
            <Link href="/documents" className="text-xs font-medium text-brand-blue hover:underline">
              View all →
            </Link>
          </div>
          {documentAlerts.length === 0 ? (
            <p className="mt-3 text-sm text-brand-teal">All documents current. Nothing expiring soon.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {documentAlerts.slice(0, 5).map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    href={`/providers/${a.row.provider_id}`}
                    className="text-brand-navy hover:text-brand-blue hover:underline"
                  >
                    {a.row.first_name} {a.row.last_name}
                  </Link>
                  <span className="text-right text-slate-500">
                    {a.docLabel}
                    {" · "}
                    <span
                      className={
                        a.state === "expired" ? "font-medium text-red-700" : "font-medium text-amber-700"
                      }
                    >
                      {a.state === "expired" ? "expired" : "expiring soon"}
                      {a.row.expires_date ? ` ${a.row.expires_date}` : ""}
                    </span>
                  </span>
                </li>
              ))}
              {documentAlerts.length > 5 && (
                <li className="text-xs text-slate-400">+{documentAlerts.length - 5} more</li>
              )}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-brand-navy">Submissions pending too long</h2>
            <Link href="/providers" className="text-xs font-medium text-brand-blue hover:underline">
              View providers →
            </Link>
          </div>
          {submissionAlerts.length === 0 ? (
            <p className="mt-3 text-sm text-brand-teal">
              No submissions pending more than {STALE_SUBMISSION_DAYS} days.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {submissionAlerts.slice(0, 5).map((a) => (
                <li key={a.row.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    href={`/providers/${a.row.provider_id}`}
                    className="text-brand-navy hover:text-brand-blue hover:underline"
                  >
                    {a.row.first_name} {a.row.last_name}
                  </Link>
                  <span className="text-right text-slate-500">
                    {a.row.payer_name} · <span className="font-medium text-amber-700">{a.daysPending}d pending</span>
                  </span>
                </li>
              ))}
              {submissionAlerts.length > 5 && (
                <li className="text-xs text-slate-400">+{submissionAlerts.length - 5} more</li>
              )}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-blue hover:shadow-sm"
          >
            <h2 className="font-medium text-brand-navy">{c.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
