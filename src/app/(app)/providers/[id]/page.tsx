"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Provider, Payer, PracticeLocation, Reference, Disclosure, ProviderDocument } from "@/lib/types";
import { DISCLOSURE_QUESTIONS } from "@/lib/disclosureQuestions";
import { DOCUMENT_TYPES, getExpirationState, EXPIRATION_STYLES, EXPIRATION_LABELS } from "@/lib/documentTypes";
import { getRecredentialingState, RECRED_STYLES, RECRED_LABELS } from "@/lib/recredentialing";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

type ProviderDetail = Provider & {
  practice_locations: PracticeLocation[];
  references: Reference[];
  disclosures: Disclosure[];
};

type SubmissionRow = {
  id: number;
  provider_id: number;
  payer_id: number;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  effective_date: string | null;
  approved_through: string | null;
  evidence_file_name: string | null;
  evidence_file_path: string | null;
  notes: string | null;
  payer_name: string;
  payer_type: string;
};

type CustomFieldValueRow = {
  custom_field_id: number;
  field_key: string;
  label: string;
  payer_id: number;
  payer_name: string;
  value: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-brand-blue-light text-brand-blue",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-brand-teal-light text-brand-teal",
  denied: "bg-red-100 text-red-800",
  terminated: "bg-slate-200 text-slate-700",
};

export default function ProviderDetailPage() {
  const allowed = useRequireAdmin();
  const params = useParams<{ id: string }>();
  const providerId = params.id;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldValueRow[]>([]);
  const [activeCustomFieldPayerId, setActiveCustomFieldPayerId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [providerRes, subsRes, payersRes, docsRes, customFieldsRes] = await Promise.all([
      fetch(`/api/providers/${providerId}`),
      fetch(`/api/submissions?provider_id=${providerId}`),
      fetch("/api/payers"),
      fetch(`/api/documents?provider_id=${providerId}`),
      fetch(`/api/providers/${providerId}/custom-fields`),
    ]);
    setProvider(await providerRes.json());
    setSubmissions(await subsRes.json());
    setPayers(await payersRes.json());
    setDocuments(await docsRes.json());
    setCustomFields(await customFieldsRes.json());
  }, [providerId]);

  useEffect(() => {
    if (allowed) refresh();
  }, [allowed, refresh]);

  if (!allowed) return null;
  if (!provider) return <p className="text-slate-500">Loading…</p>;

  const availablePayers = payers.filter((p) => !submissions.some((s) => s.payer_id === p.id));
  const yesDisclosures = provider.disclosures.filter((d) => d.answer === "yes");
  const questionLabel = (key: string) => DISCLOSURE_QUESTIONS.find((q) => q.key === key)?.label ?? key;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            {provider.first_name} {provider.middle_name ? `${provider.middle_name} ` : ""}
            {provider.last_name}
            {provider.credential ? `, ${provider.credential}` : ""}
          </h1>
          <p className="text-slate-600">
            NPI {provider.npi} · {provider.specialties || provider.nppes_specialty || "Specialty unknown"} ·{" "}
            {provider.primary_service_location || "Location unknown"}
          </p>
        </div>
        <InviteProviderButton providerId={providerId} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">Personal information</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Other names" value={provider.other_names} />
          <Detail label="Titles" value={provider.titles} />
          <Detail label="Degrees" value={provider.degrees} />
          <Detail label="First day providing services" value={provider.first_day_date} />
          <Detail label="Home address" value={provider.home_address} />
          <Detail label="Personal email" value={provider.personal_email} />
          <Detail label="Personal phone" value={provider.personal_phone} />
          <Detail label="DOB" value={provider.dob} />
          <Detail label="City of birth" value={provider.city_of_birth} />
          <Detail label="SSN" value={provider.ssn} />
          <Detail label="PCP note" value={provider.pcp_note} />
          <Detail label="Specialties" value={provider.specialties} />
          <Detail label="Age range treated" value={provider.age_range_treated} />
          <Detail label="Opioid treatment" value={provider.opioid_treatment} />
          <Detail label="Special populations" value={provider.special_populations} />
          <Detail label="Gender (directories)" value={provider.gender_for_directories} />
          <Detail label="Ethnicity (directories)" value={provider.ethnicity_for_directories} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">NPPES registry data</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="NPPES practice address" value={provider.nppes_practice_address} />
          <Detail label="NPPES practice phone" value={provider.nppes_practice_phone} />
          <Detail label="License #" value={provider.license_number} suffix={provider.license_state ?? undefined} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">CAQH & professional IDs</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="CAQH profile #" value={provider.caqh_profile_number} />
          <Detail label="CAQH username" value={provider.caqh_username} />
          <Detail label="Has CAQH login" value={provider.caqh_has_login} />
          <Detail
            label="Medicare PTAN"
            value={provider.medicare_ptan_number}
            suffix={provider.medicare_ptan_expires ? `expires ${provider.medicare_ptan_expires}` : undefined}
          />
          <Detail
            label="Medicaid #"
            value={provider.medicaid_number}
            suffix={provider.medicaid_expires ? `expires ${provider.medicaid_expires}` : undefined}
          />
          <Detail
            label="Railroad Medicare #"
            value={provider.railroad_medicare_number}
            suffix={provider.railroad_medicare_expires ? `expires ${provider.railroad_medicare_expires}` : undefined}
          />
          <Detail label="DEA #" value={provider.dea_number} />
          <Detail label="Board certification #" value={provider.board_certification_number} />
          <Detail label="Controlled substance #" value={provider.controlled_substance_number} />
          <Detail
            label="Liability insurance"
            value={
              provider.liability_ins_start && provider.liability_ins_end
                ? `${provider.liability_ins_start} → ${provider.liability_ins_end}`
                : null
            }
          />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">Documents</h2>
        <p className="mt-1 text-sm text-slate-500">
          Required for credentialing. Mark as on CAQH instead of uploading if it lives there already.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {DOCUMENT_TYPES.map((docType) => (
            <DocumentRow
              key={docType.key}
              docType={docType}
              document={documents.find((d) => d.document_type === docType.key)}
              providerId={providerId}
              onSaved={refresh}
            />
          ))}
        </div>
      </section>

      {customFields.length > 0 && (() => {
        const payerGroups = Array.from(
          new Map(customFields.map((f) => [f.payer_id, f.payer_name])).entries()
        );
        const activePayerId = payerGroups.some(([id]) => id === activeCustomFieldPayerId)
          ? activeCustomFieldPayerId
          : payerGroups[0][0];
        const visibleFields = customFields.filter((f) => f.payer_id === activePayerId);
        return (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-medium text-brand-navy">Custom fields</h2>
            <p className="mt-1 text-sm text-slate-500">
              Payer-specific questions added from the Payers page that aren&rsquo;t part of the
              standard intake form.
            </p>
            {payerGroups.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {payerGroups.map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveCustomFieldPayerId(id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      id === activePayerId
                        ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {visibleFields.map((f) => (
                <CustomFieldInput key={f.custom_field_id} field={f} providerId={providerId} onSaved={refresh} />
              ))}
            </div>
          </section>
        );
      })()}

      {(provider.hospital_admitting_type || provider.hospital_name) && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-brand-navy">Hospital admitting</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Detail label="Admitting type" value={provider.hospital_admitting_type} />
            <Detail label="Hospital name" value={provider.hospital_name} />
            <Detail label="Hospital address" value={provider.hospital_address} />
            <Detail label="Hospital phone" value={provider.hospital_phone} />
          </dl>
        </section>
      )}

      {provider.practice_locations.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-brand-navy">Additional practice locations</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Name and address</th>
                <th className="py-2 pr-4 font-medium">Frequency</th>
                <th className="py-2 pr-4 font-medium">Tax ID</th>
                <th className="py-2 font-medium">Start date</th>
              </tr>
            </thead>
            <tbody>
              {provider.practice_locations.map((loc) => (
                <tr key={loc.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{loc.name_and_address}</td>
                  <td className="py-2 pr-4 text-slate-600">{loc.frequency ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">{loc.tax_id ?? "—"}</td>
                  <td className="py-2 text-slate-600">{loc.start_date ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {provider.references.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-brand-navy">Peer references</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Name and title</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 font-medium">Address</th>
              </tr>
            </thead>
            <tbody>
              {provider.references.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 text-slate-600">{r.ref_number}</td>
                  <td className="py-2 pr-4">{r.name_title ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">{r.phone ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">{r.email ?? "—"}</td>
                  <td className="py-2 text-slate-600">{r.address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">Required disclosures</h2>
        {yesDisclosures.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No &ldquo;yes&rdquo; responses on file.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {yesDisclosures.map((d) => (
              <li key={d.id} className="rounded-lg bg-amber-50 p-3">
                <p className="font-medium text-brand-navy">{questionLabel(d.question_key)}</p>
                <p className="mt-1 text-slate-600">{d.explanation || "No explanation provided."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {provider.self_reported_innetwork_payers && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-brand-navy">Self-reported in-network payers (at intake)</h2>
          <p className="mt-2 text-sm text-slate-600">{provider.self_reported_innetwork_payers}</p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">Payer submissions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Generate a payer&rsquo;s submission packet to register a pending application. Moving a
          submission to approved requires uploaded evidence and an approved-through date.
        </p>

        {submissions.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {submissions.map((s) => (
              <SubmissionCard key={s.id} submission={s} onChanged={refresh} />
            ))}
          </div>
        )}

        {availablePayers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {availablePayers.map((p) => (
              <Link
                key={p.id}
                href={`/providers/${providerId}/packet?payer=${p.id}`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue-light"
              >
                Generate submission packet for {p.name} →
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SubmissionCard({
  submission,
  onChanged,
}: {
  submission: SubmissionRow;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState(submission.status);
  const [approvedThrough, setApprovedThrough] = useState(submission.approved_through ?? "");
  const [notes, setNotes] = useState(submission.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const recredState = getRecredentialingState(submission.status, submission.approved_through);

  async function saveStatus(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("status", status);
      formData.set("approved_through", approvedThrough);
      formData.set("notes", notes);
      if (evidenceInputRef.current?.files?.[0]) {
        formData.set("evidence_file", evidenceInputRef.current.files[0]);
      }
      const res = await fetch(`/api/submissions/${submission.id}/status`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update status.");
        return;
      }
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{submission.payer_name}</p>
        <div className="flex items-center gap-1.5">
          {submission.status === "approved" && recredState !== "current" && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RECRED_STYLES[recredState]}`}>
              {RECRED_LABELS[recredState]}
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[submission.status] ?? ""}`}>
            {submission.status}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Submitted {submission.submitted_at.slice(0, 10)}
        {submission.approved_through && ` · approved through ${submission.approved_through}`}
        {submission.evidence_file_path && (
          <>
            {" · "}
            <a
              href={`/api/submissions/${submission.id}/evidence`}
              className="text-brand-blue hover:underline"
            >
              {submission.evidence_file_name ?? "evidence"}
            </a>
          </>
        )}
      </p>
      {submission.notes && (
        <p className="mt-1 text-xs italic text-slate-600">&ldquo;{submission.notes}&rdquo;</p>
      )}

      <form onSubmit={saveStatus} className="mt-2 flex flex-wrap items-end gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="terminated">Terminated</option>
        </select>
        {status === "approved" && (
          <>
            <input
              ref={evidenceInputRef}
              type="file"
              title="Screenshot or document proving approval"
              className="max-w-[180px] text-xs"
            />
            <input
              type="date"
              value={approvedThrough}
              onChange={(e) => setApprovedThrough(e.target.value)}
              title="Approved through"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </>
        )}
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (e.g. reason for a delay)"
          className="w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40"
        >
          Update status
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CustomFieldInput({
  field,
  providerId,
  onSaved,
}: {
  field: CustomFieldValueRow;
  providerId: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(field.value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value === (field.value ?? "")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}/custom-fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { [field.custom_field_id]: value } }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{field.label}</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={saving}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function DocumentRow({
  docType,
  document,
  providerId,
  onSaved,
}: {
  docType: { key: string; label: string };
  document: ProviderDocument | undefined;
  providerId: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<"on_file" | "on_caqh">(document?.status ?? "on_file");
  const [issuedDate, setIssuedDate] = useState(document?.issued_date ?? "");
  const [expiresDate, setExpiresDate] = useState(document?.expires_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expirationState = getExpirationState(document?.status, document?.expires_date);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("provider_id", providerId);
      formData.set("document_type", docType.key);
      formData.set("status", status);
      formData.set("issued_date", issuedDate);
      formData.set("expires_date", expiresDate);
      if (status === "on_file" && fileInputRef.current?.files?.[0]) {
        formData.set("file", fileInputRef.current.files[0]);
      }
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save document.");
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{docType.label}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRATION_STYLES[expirationState]}`}>
          {EXPIRATION_LABELS[expirationState]}
        </span>
      </div>

      {document?.status === "on_file" && document.file_path && (
        <p className="mt-1 text-xs text-slate-600">
          <a
            href={`/api/documents/${document.id}/file`}
            className="text-brand-blue hover:underline"
          >
            {document.file_name}
          </a>
          {document.uploaded_at && ` · uploaded ${document.uploaded_at.slice(0, 10)}`}
        </p>
      )}

      <form onSubmit={handleUpload} className="mt-2 flex flex-wrap items-end gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "on_file" | "on_caqh")}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="on_file">Upload file</option>
          <option value="on_caqh">On CAQH (no upload)</option>
        </select>
        {status === "on_file" && (
          <input
            ref={fileInputRef}
            type="file"
            className="max-w-[180px] text-xs"
          />
        )}
        <input
          type="date"
          value={issuedDate}
          onChange={(e) => setIssuedDate(e.target.value)}
          title="Issued date"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        <input
          type="date"
          value={expiresDate}
          onChange={(e) => setExpiresDate(e.target.value)}
          title="Expires date"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40"
        >
          {document ? "Update" : "Save"}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function InviteProviderButton({ providerId }: { providerId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: Number(providerId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create invite.");
        return;
      }
      setLink(`${window.location.origin}${data.url}`);
      setCopied(false);
    } finally {
      setGenerating(false);
    }
  }

  if (link) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
        <span className="max-w-[220px] truncate text-slate-600">{link}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(link);
            setCopied(true);
          }}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-brand-blue hover:bg-brand-blue-light"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={generating}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue-light disabled:opacity-40"
      >
        {generating ? "Generating…" : "Invite provider to set up account"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Detail({ label, value, suffix }: { label: string; value: string | null; suffix?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-brand-navy">
        {value ? `${value}${suffix ? ` (${suffix})` : ""}` : "—"}
      </dd>
    </div>
  );
}
