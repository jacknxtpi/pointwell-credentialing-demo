"use client";

import { useEffect, useState } from "react";
import { DISCLOSURE_QUESTIONS } from "@/lib/disclosureQuestions";
import { useRequireProvider } from "@/lib/useRequireAdmin";

type MyProvider = {
  id: number;
  npi: string;
  first_name: string;
  last_name: string;
  credential: string | null;
  nppes_specialty: string | null;
  license_number: string | null;
  license_state: string | null;
  [key: string]: unknown;
  practice_locations: Array<{
    id?: number;
    name_and_address: string;
    frequency: string | null;
    tax_id: string | null;
    start_date: string | null;
  }>;
  references: Array<{
    ref_number: number;
    name_title: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  }>;
  disclosures: Array<{ question_key: string; answer: string | null; explanation: string | null }>;
};

type SubmissionRow = {
  id: number;
  payer_id: number;
  status: string;
  submitted_at: string;
  effective_date: string | null;
  approved_through: string | null;
  payer_name: string;
};

type NetworkStatusRow = {
  id: number;
  status: string;
  effective_date: string | null;
  recorded_at: string;
  plan_name: string;
  line_of_business_name: string;
  payer_name: string;
};

const EDITABLE_FIELDS: Array<{ key: string; label: string; type?: string; wide?: boolean }> = [
  { key: "middle_name", label: "Middle name (full)" },
  { key: "other_names", label: "Any other names (maiden, legal changes)" },
  { key: "titles", label: "Titles (e.g. NP, CNP, MD, PT, OT)" },
  { key: "degrees", label: "Degrees" },
  { key: "primary_service_location", label: "Primary service location" },
  { key: "first_day_date", label: "Official first day providing services", type: "date" },
  { key: "home_address", label: "Home address (not a PO Box or work)", wide: true },
  { key: "personal_email", label: "Personal email" },
  { key: "personal_phone", label: "Personal phone" },
  { key: "dob", label: "Date of birth", type: "date" },
  { key: "city_of_birth", label: "City of birth" },
  { key: "ssn", label: "SSN" },
  { key: "pcp_note", label: "PCP designation note", wide: true },
  { key: "specialties", label: "Primary/secondary/additional specialties", wide: true },
  { key: "age_range_treated", label: "Age range of patients treated" },
  { key: "opioid_treatment", label: "Opioid treatment (describe if yes)", wide: true },
  { key: "special_populations", label: "Special patient populations", wide: true },
  { key: "gender_for_directories", label: "Gender for directories (optional)" },
  { key: "ethnicity_for_directories", label: "Ethnicity for directories (optional)" },
  { key: "caqh_profile_number", label: "CAQH profile number" },
  { key: "caqh_username", label: "CAQH username" },
  { key: "caqh_has_login", label: "Has a CAQH login? (yes / no / TBD)" },
  { key: "medicare_ptan_number", label: "Medicare PTAN #" },
  { key: "medicare_ptan_issued", label: "Medicare PTAN issued", type: "date" },
  { key: "medicare_ptan_expires", label: "Medicare PTAN expires", type: "date" },
  { key: "medicaid_number", label: "Medicaid #" },
  { key: "medicaid_issued", label: "Medicaid issued", type: "date" },
  { key: "medicaid_expires", label: "Medicaid expires", type: "date" },
  { key: "railroad_medicare_number", label: "Railroad Medicare #" },
  { key: "dea_number", label: "DEA #" },
  { key: "board_certification_number", label: "Board certification #" },
  { key: "controlled_substance_number", label: "Controlled substance #" },
  { key: "liability_ins_start", label: "Liability insurance start", type: "date" },
  { key: "liability_ins_end", label: "Liability insurance end", type: "date" },
  { key: "hospital_admitting_type", label: "Hospital admitting type", wide: true },
  { key: "hospital_name", label: "Hospital name" },
  { key: "hospital_phone", label: "Hospital phone" },
  { key: "hospital_address", label: "Hospital address", wide: true },
  { key: "self_reported_innetwork_payers", label: "Insurance companies you know you're in-network with", wide: true },
];

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-brand-blue-light text-brand-blue",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-brand-teal-light text-brand-teal",
  denied: "bg-red-100 text-red-800",
  terminated: "bg-slate-200 text-slate-700",
  in_network: "bg-brand-teal-light text-brand-teal",
  not_in_network: "bg-red-100 text-red-800",
};

export default function MyProfilePage() {
  const allowed = useRequireProvider();
  const [provider, setProvider] = useState<MyProvider | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<MyProvider["practice_locations"]>([]);
  const [references, setReferences] = useState<MyProvider["references"]>([]);
  const [disclosures, setDisclosures] = useState<Record<string, { answer: string; explanation: string }>>({});
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [networkStatuses, setNetworkStatuses] = useState<NetworkStatusRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    Promise.all([
      fetch("/api/my/provider").then((r) => r.json()),
      fetch("/api/my/submissions").then((r) => r.json()),
      fetch("/api/my/network-statuses").then((r) => r.json()),
    ]).then(([p, subs, statuses]) => {
      setProvider(p);
      const initialForm: Record<string, string> = {};
      for (const f of EDITABLE_FIELDS) initialForm[f.key] = (p[f.key] as string) ?? "";
      setForm(initialForm);
      setLocations(p.practice_locations ?? []);
      const refs =
        p.references && p.references.length === 3
          ? p.references
          : [1, 2, 3].map(
              (n) => p.references?.find((r: { ref_number: number }) => r.ref_number === n) ?? {
                ref_number: n,
                name_title: "",
                phone: "",
                email: "",
                address: "",
              }
            );
      setReferences(refs);
      const disclosureMap: Record<string, { answer: string; explanation: string }> = {};
      for (const q of DISCLOSURE_QUESTIONS) {
        const existing = p.disclosures?.find((d: { question_key: string }) => d.question_key === q.key);
        disclosureMap[q.key] = { answer: existing?.answer ?? "", explanation: existing?.explanation ?? "" };
      }
      setDisclosures(disclosureMap);
      setSubmissions(subs);
      setNetworkStatuses(statuses);
    });
  }, [allowed]);

  function updateField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateReference(index: number, field: string, value: string) {
    setReferences((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addLocation() {
    setLocations((rows) => [...rows, { name_and_address: "", frequency: "", tax_id: "", start_date: "" }]);
  }

  function updateLocation(index: number, field: string, value: string) {
    setLocations((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeLocation(index: number) {
    setLocations((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/my/provider", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          practice_locations: locations.filter((l) => l.name_and_address.trim()),
          references,
          disclosures: Object.entries(disclosures).map(([question_key, v]) => ({
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
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return null;
  if (!provider) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          {provider.first_name} {provider.last_name}
          {provider.credential ? `, ${provider.credential}` : ""}
        </h1>
        <p className="text-slate-600">
          NPI {provider.npi} · {provider.nppes_specialty ?? "Specialty on file with NPPES"}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">My status</h2>
        <p className="mt-1 text-sm text-slate-500">Read-only — your admin updates these.</p>
        {submissions.length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-4 font-medium">Payer</th>
                <th className="py-1 pr-4 font-medium">Status</th>
                <th className="py-1 font-medium">Approved through</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4">{s.payer_name}</td>
                  <td className="py-1.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status] ?? ""}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-1.5 text-slate-600">{s.approved_through ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {networkStatuses.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-4 font-medium">Payer</th>
                <th className="py-1 pr-4 font-medium">Plan</th>
                <th className="py-1 font-medium">Network status</th>
              </tr>
            </thead>
            <tbody>
              {networkStatuses.map((n) => (
                <tr key={n.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4">{n.payer_name}</td>
                  <td className="py-1.5 pr-4 text-slate-600">
                    {n.line_of_business_name} · {n.plan_name}
                  </td>
                  <td className="py-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[n.status] ?? ""}`}>
                      {n.status === "in_network" ? "in-network" : "not in-network"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {submissions.length === 0 && networkStatuses.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">Nothing on file yet.</p>
        )}
      </section>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-medium text-brand-navy">My information</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {EDITABLE_FIELDS.map((f) => (
              <div key={f.key} className={f.wide ? "sm:col-span-2" : undefined}>
                <label className="block text-sm font-medium text-slate-700">{f.label}</label>
                <input
                  type={f.type ?? "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            ))}
          </div>
        </fieldset>

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
            {Object.entries(groupBySection()).map(([section, questions]) => (
              <div key={section}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section}</h3>
                <div className="mt-2 flex flex-col gap-3">
                  {questions.map((q) => {
                    const row = disclosures[q.key] ?? { answer: "", explanation: "" };
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
                                    setDisclosures((d) => ({ ...d, [q.key]: { ...row, answer: opt } }))
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
                              setDisclosures((d) => ({ ...d, [q.key]: { ...row, explanation: e.target.value } }))
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
        {saved && <p className="text-sm text-brand-teal">Saved.</p>}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function groupBySection(): Record<string, typeof DISCLOSURE_QUESTIONS> {
  const groups: Record<string, typeof DISCLOSURE_QUESTIONS> = {};
  for (const q of DISCLOSURE_QUESTIONS) {
    groups[q.section] = groups[q.section] ? [...groups[q.section], q] : [q];
  }
  return groups;
}
