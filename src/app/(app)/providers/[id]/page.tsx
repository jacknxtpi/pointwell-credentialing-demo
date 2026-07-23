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

      <ProviderInfoSections provider={provider} providerId={providerId} onSaved={refresh} />

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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Payer:</span>
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
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {visibleFields.map((f) => (
                <CustomFieldInput key={f.custom_field_id} field={f} providerId={providerId} onSaved={refresh} />
              ))}
            </div>
          </section>
        );
      })()}

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

type EditField = { key: string; label: string; type?: string; wide?: boolean };

const IDENTITY_FIELDS: EditField[] = [
  { key: "npi", label: "NPI" },
  { key: "first_name", label: "First name" },
  { key: "middle_name", label: "Middle name" },
  { key: "last_name", label: "Last name" },
  { key: "credential", label: "Credential" },
];

const PERSONAL_FIELDS: EditField[] = [
  { key: "primary_service_location", label: "Primary service location" },
  { key: "other_names", label: "Other names (maiden, legal)" },
  { key: "titles", label: "Titles" },
  { key: "degrees", label: "Degrees" },
  { key: "first_day_date", label: "First day providing services", type: "date" },
  { key: "home_address", label: "Home address", wide: true },
  { key: "personal_email", label: "Personal email" },
  { key: "personal_phone", label: "Personal phone" },
  { key: "dob", label: "Date of birth", type: "date" },
  { key: "city_of_birth", label: "City of birth" },
  { key: "pcp_note", label: "PCP note", wide: true },
  { key: "specialties", label: "Specialties", wide: true },
  { key: "age_range_treated", label: "Age range treated" },
  { key: "opioid_treatment", label: "Opioid treatment" },
  { key: "special_populations", label: "Special populations", wide: true },
  { key: "gender_for_directories", label: "Gender (directories)" },
  { key: "ethnicity_for_directories", label: "Ethnicity (directories)" },
];

const NPPES_LICENSE_FIELDS: EditField[] = [
  { key: "nppes_specialty", label: "NPPES specialty" },
  { key: "nppes_practice_address", label: "NPPES practice address", wide: true },
  { key: "nppes_practice_phone", label: "NPPES practice phone" },
  { key: "license_number", label: "License number" },
  { key: "license_state", label: "License state" },
];

const CAQH_PROFESSIONAL_FIELDS: EditField[] = [
  { key: "caqh_profile_number", label: "CAQH profile #" },
  { key: "caqh_username", label: "CAQH username" },
  { key: "caqh_has_login", label: "Has CAQH login" },
  { key: "medicare_ptan_number", label: "Medicare PTAN" },
  { key: "medicare_ptan_issued", label: "Medicare PTAN issued", type: "date" },
  { key: "medicare_ptan_expires", label: "Medicare PTAN expires", type: "date" },
  { key: "medicaid_number", label: "Medicaid #" },
  { key: "medicaid_issued", label: "Medicaid issued", type: "date" },
  { key: "medicaid_expires", label: "Medicaid expires", type: "date" },
  { key: "railroad_medicare_number", label: "Railroad Medicare #" },
  { key: "railroad_medicare_issued", label: "Railroad Medicare issued", type: "date" },
  { key: "railroad_medicare_expires", label: "Railroad Medicare expires", type: "date" },
  { key: "dea_number", label: "DEA #" },
  { key: "board_certification_number", label: "Board certification #" },
  { key: "controlled_substance_number", label: "Controlled substance #" },
  { key: "liability_ins_start", label: "Liability insurance start", type: "date" },
  { key: "liability_ins_end", label: "Liability insurance end", type: "date" },
];

const HOSPITAL_FIELDS: EditField[] = [
  { key: "hospital_admitting_type", label: "Admitting type", wide: true },
  { key: "hospital_name", label: "Hospital name" },
  { key: "hospital_phone", label: "Hospital phone" },
  { key: "hospital_address", label: "Hospital address", wide: true },
];

const SELF_REPORTED_FIELDS: EditField[] = [
  { key: "self_reported_innetwork_payers", label: "Self-reported in-network payers (at intake)", wide: true },
];

const ALL_EDIT_GROUPS = [
  { title: "Identity", fields: IDENTITY_FIELDS },
  { title: "Personal information", fields: PERSONAL_FIELDS },
  { title: "NPPES registry data & license", fields: NPPES_LICENSE_FIELDS },
  { title: "CAQH & professional IDs", fields: CAQH_PROFESSIONAL_FIELDS },
  { title: "Hospital admitting", fields: HOSPITAL_FIELDS },
  { title: "Self-reported in-network payers", fields: SELF_REPORTED_FIELDS },
];

function ProviderInfoSections({
  provider,
  providerId,
  onSaved,
}: {
  provider: ProviderDetail;
  providerId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<ProviderDetail["practice_locations"]>([]);
  const [references, setReferences] = useState<ProviderDetail["references"]>([]);
  const [disclosureAnswers, setDisclosureAnswers] = useState<
    Record<string, { answer: string; explanation: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yesDisclosures = provider.disclosures.filter((d) => d.answer === "yes");
  const questionLabel = (key: string) => DISCLOSURE_QUESTIONS.find((q) => q.key === key)?.label ?? key;

  function startEditing() {
    const initial: Record<string, string> = {};
    for (const group of ALL_EDIT_GROUPS) {
      for (const f of group.fields) {
        initial[f.key] = (provider[f.key as keyof ProviderDetail] as string) ?? "";
      }
    }
    setForm(initial);
    setLocations(provider.practice_locations);
    const refs =
      provider.references.length === 3
        ? provider.references
        : [1, 2, 3].map(
            (n) =>
              provider.references.find((r) => r.ref_number === n) ?? {
                ref_number: n,
                name_title: "",
                phone: "",
                email: "",
                address: "",
              }
          );
    setReferences(refs as ProviderDetail["references"]);
    const disclosureMap: Record<string, { answer: string; explanation: string }> = {};
    for (const q of DISCLOSURE_QUESTIONS) {
      const existing = provider.disclosures.find((d) => d.question_key === q.key);
      disclosureMap[q.key] = { answer: existing?.answer ?? "", explanation: existing?.explanation ?? "" };
    }
    setDisclosureAnswers(disclosureMap);
    setError(null);
    setEditing(true);
  }

  function addLocation() {
    setLocations((rows) => [...rows, { name_and_address: "", frequency: "", tax_id: "", start_date: "" } as ProviderDetail["practice_locations"][number]]);
  }

  function updateLocation(index: number, field: string, value: string) {
    setLocations((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeLocation(index: number) {
    setLocations((rows) => rows.filter((_, i) => i !== index));
  }

  function updateReference(index: number, field: string, value: string) {
    setReferences((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          practice_locations: locations.filter((l) => l.name_and_address.trim()),
          references,
          disclosures: Object.entries(disclosureAnswers).map(([question_key, v]) => ({
            question_key,
            answer: v.answer,
            explanation: v.explanation,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-6">
        {ALL_EDIT_GROUPS.map((group) => (
          <fieldset key={group.title} className="rounded-xl border border-slate-200 bg-white p-5">
            <legend className="px-1 text-sm font-medium text-brand-navy">{group.title}</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {group.fields.map((f) => (
                <div key={f.key} className={f.wide ? "sm:col-span-2" : undefined}>
                  <label className="block text-sm font-medium text-slate-700">{f.label}</label>
                  <input
                    type={f.type ?? "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-medium text-brand-navy">Additional practice locations</legend>
          <div className="mt-2 flex flex-col gap-3">
            {locations.map((loc, i) => (
              <div key={i} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Practice/hospital name and address</label>
                  <input
                    value={loc.name_and_address}
                    onChange={(e) => updateLocation(i, "name_and_address", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">How often</label>
                  <input
                    value={loc.frequency ?? ""}
                    onChange={(e) => updateLocation(i, "frequency", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Tax ID</label>
                  <input
                    value={loc.tax_id ?? ""}
                    onChange={(e) => updateLocation(i, "tax_id", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => removeLocation(i)}
                    className="mt-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addLocation}
              className="self-start rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue-light"
            >
              + Add practice location
            </button>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-medium text-brand-navy">Peer references (minimum 3, required)</legend>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Field</th>
                  {references.map((r) => (
                    <th key={r.ref_number} className="px-3 py-1 font-medium">
                      Ref {r.ref_number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["name_title", "phone", "email", "address"] as const).map((field) => (
                  <tr key={field} className="border-t border-slate-100">
                    <td className="py-2 pr-3 text-slate-600">
                      {field === "name_title"
                        ? "Name and title"
                        : field === "phone"
                          ? "Phone"
                          : field === "email"
                            ? "Email"
                            : "Home address or place of employment"}
                    </td>
                    {references.map((r, i) => (
                      <td key={r.ref_number} className="px-3 py-2">
                        <input
                          value={(r[field] as string) ?? ""}
                          onChange={(e) => updateReference(i, field, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-medium text-brand-navy">Required disclosure information</legend>
          <p className="mt-1 text-xs text-slate-500">All &ldquo;yes&rdquo; responses require an explanation.</p>
          <div className="mt-3 flex flex-col gap-5">
            {Object.entries(
              DISCLOSURE_QUESTIONS.reduce<Record<string, typeof DISCLOSURE_QUESTIONS>>((groups, q) => {
                groups[q.section] = groups[q.section] ? [...groups[q.section], q] : [q];
                return groups;
              }, {})
            ).map(([section, questions]) => (
              <div key={section}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section}</h3>
                <div className="mt-2 flex flex-col gap-3">
                  {questions.map((q) => {
                    const row = disclosureAnswers[q.key] ?? { answer: "", explanation: "" };
                    return (
                      <div key={q.key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-slate-700">{q.label}</p>
                          <div className="flex gap-3">
                            {(["yes", "no"] as const).map((opt) => (
                              <label key={opt} className="flex items-center gap-1 text-sm text-slate-600">
                                <input
                                  type="radio"
                                  name={q.key}
                                  checked={row.answer === opt}
                                  onChange={() =>
                                    setDisclosureAnswers((d) => ({ ...d, [q.key]: { ...row, answer: opt } }))
                                  }
                                />
                                {opt === "yes" ? "Yes" : "No"}
                              </label>
                            ))}
                          </div>
                        </div>
                        {row.answer === "yes" && (
                          <input
                            value={row.explanation}
                            onChange={(e) =>
                              setDisclosureAnswers((d) => ({ ...d, [q.key]: { ...row, explanation: e.target.value } }))
                            }
                            placeholder="Explanation, time frame, final outcome"
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={startEditing}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-brand-blue-light"
        >
          Edit provider info
        </button>
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

      {provider.self_reported_innetwork_payers && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-brand-navy">Self-reported in-network payers (at intake)</h2>
          <p className="mt-2 text-sm text-slate-600">{provider.self_reported_innetwork_payers}</p>
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
    </>
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
