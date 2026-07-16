"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NpiLookupResult } from "@/lib/npi";
import { DISCLOSURE_QUESTIONS } from "@/lib/disclosureQuestions";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

const emptyForm = {
  npi: "",
  first_name: "",
  last_name: "",
  credential: "",
  nppes_specialty: "",
  nppes_practice_address: "",
  nppes_practice_phone: "",
  license_number: "",
  license_state: "",

  middle_name: "",
  other_names: "",
  titles: "",
  primary_service_location: "",
  first_day_date: "",
  home_address: "",
  personal_email: "",
  personal_phone: "",
  dob: "",
  city_of_birth: "",
  ssn: "",
  degrees: "",
  pcp_note: "",
  specialties: "",
  age_range_treated: "",
  opioid_treatment: "",
  special_populations: "",
  gender_for_directories: "",
  ethnicity_for_directories: "",

  caqh_profile_number: "",
  caqh_username: "",
  caqh_has_login: "",

  medicare_ptan_number: "",
  medicare_ptan_issued: "",
  medicare_ptan_expires: "",
  medicaid_number: "",
  medicaid_issued: "",
  medicaid_expires: "",
  railroad_medicare_number: "",
  railroad_medicare_issued: "",
  railroad_medicare_expires: "",

  dea_number: "",
  board_certification_number: "",
  controlled_substance_number: "",
  liability_ins_start: "",
  liability_ins_end: "",

  hospital_admitting_type: "",
  hospital_name: "",
  hospital_address: "",
  hospital_phone: "",

  self_reported_innetwork_payers: "",
};

type FormState = typeof emptyForm;

type PracticeLocationRow = {
  name_and_address: string;
  frequency: string;
  tax_id: string;
  start_date: string;
};

type ReferenceRow = {
  ref_number: number;
  name_title: string;
  phone: string;
  email: string;
  address: string;
};

type DisclosureRow = {
  answer: "" | "yes" | "no";
  explanation: string;
};

const emptyReferences: ReferenceRow[] = [1, 2, 3].map((n) => ({
  ref_number: n,
  name_title: "",
  phone: "",
  email: "",
  address: "",
}));

const emptyDisclosures: Record<string, DisclosureRow> = Object.fromEntries(
  DISCLOSURE_QUESTIONS.map((q) => [q.key, { answer: "", explanation: "" }])
);

const NPPES_FIELDS = new Set([
  "first_name",
  "last_name",
  "credential",
  "nppes_specialty",
  "nppes_practice_address",
  "nppes_practice_phone",
]);

export default function NewProviderPage() {
  const allowed = useRequireAdmin();
  const router = useRouter();
  const [npiInput, setNpiInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [practiceLocations, setPracticeLocations] = useState<PracticeLocationRow[]>([]);
  const [references, setReferences] = useState<ReferenceRow[]>(emptyReferences);
  const [disclosures, setDisclosures] = useState<Record<string, DisclosureRow>>(emptyDisclosures);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/npi-lookup?npi=${encodeURIComponent(npiInput.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error ?? "Lookup failed.");
        return;
      }
      const result = data as NpiLookupResult;
      setForm({
        ...emptyForm,
        npi: result.npi,
        first_name: result.firstName,
        last_name: result.lastName,
        credential: result.credential ?? "",
        nppes_specialty: result.providerType ?? "",
        nppes_practice_address: result.practiceAddress ?? "",
        nppes_practice_phone: result.practicePhone ?? "",
        license_number: result.licenseNumber ?? "",
        license_state: result.licenseState ?? "",
        specialties: result.providerType ?? "",
      });
    } catch {
      setLookupError("Could not reach the NPPES registry.");
    } finally {
      setLookupLoading(false);
    }
  }

  function update(field: keyof FormState, value: string) {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  }

  function updateReference(index: number, field: keyof ReferenceRow, value: string) {
    setReferences((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function updateDisclosure(key: string, patch: Partial<DisclosureRow>) {
    setDisclosures((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  function addPracticeLocation() {
    setPracticeLocations((rows) => [
      ...rows,
      { name_and_address: "", frequency: "", tax_id: "", start_date: "" },
    ]);
  }

  function updatePracticeLocation(index: number, field: keyof PracticeLocationRow, value: string) {
    setPracticeLocations((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function removePracticeLocation(index: number) {
    setPracticeLocations((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          practice_locations: practiceLocations.filter((l) => l.name_and_address.trim()),
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
        setSaveError(data.error ?? "Failed to save provider.");
        return;
      }
      router.push(`/providers/${data.id}`);
    } catch {
      setSaveError("Failed to save provider.");
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Add a Provider</h1>
        <p className="mt-2 text-slate-600">
          Step 1 pulls what it can from the real NPPES NPI Registry. Step 2 fills in the rest of
          the MDHC onboarding form — please use synthetic data for SSN, DOB, and other sensitive
          fields in this demo.
        </p>
      </div>

      <form onSubmit={handleLookup} className="flex items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Provider NPI</label>
          <input
            value={npiInput}
            onChange={(e) => setNpiInput(e.target.value)}
            placeholder="10-digit NPI, e.g. 1234567893"
            className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            maxLength={10}
          />
        </div>
        <button
          type="submit"
          disabled={lookupLoading || npiInput.trim().length !== 10}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-40"
        >
          {lookupLoading ? "Looking up…" : "Look up NPI"}
        </button>
      </form>

      <div className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center">
        <span>
          Don&rsquo;t have an NPI handy? <span className="font-mono text-brand-navy">1245319599</span> is
          a real, registered NPPES record you can use to try the lookup.
        </span>
        <button
          type="button"
          onClick={() => setNpiInput("1245319599")}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue-light sm:ml-auto"
        >
          Use this NPI
        </button>
      </div>
      {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}

      {form && (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="rounded-lg bg-brand-teal-light px-4 py-2 text-sm text-brand-navy">
            Loaded from NPPES. Fields not in the public registry are blank — fill them in below.
          </div>

          <Section title="From NPPES registry (auto-filled)">
            <Field label="NPI" value={form.npi} readOnly />
            <Field label="First name" value={form.first_name} onChange={(v) => update("first_name", v)} highlighted />
            <Field label="Last name" value={form.last_name} onChange={(v) => update("last_name", v)} highlighted />
            <Field label="Credential" value={form.credential} onChange={(v) => update("credential", v)} highlighted />
            <Field
              label="NPPES specialty"
              value={form.nppes_specialty}
              onChange={(v) => update("nppes_specialty", v)}
              highlighted
            />
            <Field
              label="NPPES practice address"
              value={form.nppes_practice_address}
              onChange={(v) => update("nppes_practice_address", v)}
              highlighted
              wide
            />
            <Field
              label="NPPES practice phone"
              value={form.nppes_practice_phone}
              onChange={(v) => update("nppes_practice_phone", v)}
              highlighted
            />
          </Section>

          <Section title="Personal information">
            <Field label="Middle name (full)" value={form.middle_name} onChange={(v) => update("middle_name", v)} />
            <Field label="Any other names (maiden, legal changes)" value={form.other_names} onChange={(v) => update("other_names", v)} />
            <Field label="Titles (e.g. NP, CNP, MD, PT, OT)" value={form.titles} onChange={(v) => update("titles", v)} />
            <Field label="Degrees" value={form.degrees} onChange={(v) => update("degrees", v)} />
            <Field
              label="Primary service location"
              value={form.primary_service_location}
              onChange={(v) => update("primary_service_location", v)}
              placeholder="e.g. Aberdeen, Brandon, Huron"
            />
            <Field
              label="Official first day providing services"
              value={form.first_day_date}
              onChange={(v) => update("first_day_date", v)}
              type="date"
            />
            <Field label="Home address (not a PO Box or work)" value={form.home_address} onChange={(v) => update("home_address", v)} wide />
            <Field label="Personal email" value={form.personal_email} onChange={(v) => update("personal_email", v)} />
            <Field label="Personal phone" value={form.personal_phone} onChange={(v) => update("personal_phone", v)} />
            <Field label="Date of birth" value={form.dob} onChange={(v) => update("dob", v)} type="date" />
            <Field label="City of birth" value={form.city_of_birth} onChange={(v) => update("city_of_birth", v)} />
            <Field label="SSN (synthetic only)" value={form.ssn} onChange={(v) => update("ssn", v)} placeholder="e.g. 000-00-0000" />
            <Field label="PCP designation note" value={form.pcp_note} onChange={(v) => update("pcp_note", v)} wide />
            <Field label="Primary/secondary/additional specialties" value={form.specialties} onChange={(v) => update("specialties", v)} wide />
            <Field label="Age range of patients treated" value={form.age_range_treated} onChange={(v) => update("age_range_treated", v)} />
            <Field label="Opioid treatment (describe if yes)" value={form.opioid_treatment} onChange={(v) => update("opioid_treatment", v)} wide />
            <Field label="Special patient populations" value={form.special_populations} onChange={(v) => update("special_populations", v)} wide />
            <Field label="Gender for directories (optional)" value={form.gender_for_directories} onChange={(v) => update("gender_for_directories", v)} />
            <Field label="Ethnicity for directories (optional)" value={form.ethnicity_for_directories} onChange={(v) => update("ethnicity_for_directories", v)} />
          </Section>

          <Section title="CAQH & other logins">
            <Field label="CAQH profile number" value={form.caqh_profile_number} onChange={(v) => update("caqh_profile_number", v)} />
            <Field label="CAQH username" value={form.caqh_username} onChange={(v) => update("caqh_username", v)} />
            <Field
              label="Has a CAQH login? (yes / no / TBD)"
              value={form.caqh_has_login}
              onChange={(v) => update("caqh_has_login", v)}
            />
            <p className="sm:col-span-2 text-xs text-slate-500">
              We intentionally don&rsquo;t store CAQH passwords in this system — handle those through a
              password manager or a secure credential process outside the app.
            </p>
          </Section>

          <Section title="Professional IDs">
            <Field label="Medicare PTAN #" value={form.medicare_ptan_number} onChange={(v) => update("medicare_ptan_number", v)} />
            <Field label="Medicare PTAN issued" value={form.medicare_ptan_issued} onChange={(v) => update("medicare_ptan_issued", v)} type="date" />
            <Field label="Medicare PTAN expires" value={form.medicare_ptan_expires} onChange={(v) => update("medicare_ptan_expires", v)} type="date" />
            <Field label="Medicaid #" value={form.medicaid_number} onChange={(v) => update("medicaid_number", v)} />
            <Field label="Medicaid issued" value={form.medicaid_issued} onChange={(v) => update("medicaid_issued", v)} type="date" />
            <Field label="Medicaid expires" value={form.medicaid_expires} onChange={(v) => update("medicaid_expires", v)} type="date" />
            <Field label="Railroad Medicare #" value={form.railroad_medicare_number} onChange={(v) => update("railroad_medicare_number", v)} />
            <Field label="Railroad Medicare issued" value={form.railroad_medicare_issued} onChange={(v) => update("railroad_medicare_issued", v)} type="date" />
            <Field label="Railroad Medicare expires" value={form.railroad_medicare_expires} onChange={(v) => update("railroad_medicare_expires", v)} type="date" />
          </Section>

          <Section title="Other credentialing identifiers">
            <Field label="License #" value={form.license_number} onChange={(v) => update("license_number", v)} highlighted={!!form.license_number} />
            <Field label="License state" value={form.license_state} onChange={(v) => update("license_state", v)} highlighted={!!form.license_state} />
            <Field label="DEA #" value={form.dea_number} onChange={(v) => update("dea_number", v)} />
            <Field label="Board certification #" value={form.board_certification_number} onChange={(v) => update("board_certification_number", v)} />
            <Field label="Controlled substance #" value={form.controlled_substance_number} onChange={(v) => update("controlled_substance_number", v)} />
            <Field label="Liability insurance start" value={form.liability_ins_start} onChange={(v) => update("liability_ins_start", v)} type="date" />
            <Field label="Liability insurance end" value={form.liability_ins_end} onChange={(v) => update("liability_ins_end", v)} type="date" />
          </Section>

          <Section title="Hospital admitting (if other than default facility)">
            <Field label="Admitting type (privileges, affiliation, hospitalist group)" value={form.hospital_admitting_type} onChange={(v) => update("hospital_admitting_type", v)} wide />
            <Field label="Hospital name" value={form.hospital_name} onChange={(v) => update("hospital_name", v)} />
            <Field label="Hospital phone" value={form.hospital_phone} onChange={(v) => update("hospital_phone", v)} />
            <Field label="Hospital address" value={form.hospital_address} onChange={(v) => update("hospital_address", v)} wide />
          </Section>

          <Section title="Known in-network payers (self-reported at intake)">
            <Field
              label="Insurance companies you know you're currently in-network with (skip if unknown)"
              value={form.self_reported_innetwork_payers}
              onChange={(v) => update("self_reported_innetwork_payers", v)}
              wide
            />
          </Section>

          <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
            <legend className="px-1 text-sm font-medium text-brand-navy">
              Additional practice locations
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Locations besides the primary MDHC site the provider works at, even occasionally.
            </p>
            <div className="mt-3 flex flex-col gap-4">
              {practiceLocations.map((loc, i) => (
                <div key={i} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Practice/hospital name and address</label>
                    <input
                      value={loc.name_and_address}
                      onChange={(e) => updatePracticeLocation(i, "name_and_address", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">How often</label>
                    <input
                      value={loc.frequency}
                      onChange={(e) => updatePracticeLocation(i, "frequency", e.target.value)}
                      placeholder="daily, weekly, monthly, occasionally"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tax ID</label>
                    <input
                      value={loc.tax_id}
                      onChange={(e) => updatePracticeLocation(i, "tax_id", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Start date</label>
                    <input
                      type="date"
                      value={loc.start_date}
                      onChange={(e) => updatePracticeLocation(i, "start_date", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => removePracticeLocation(i)}
                      className="mt-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addPracticeLocation}
                className="self-start rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue-light"
              >
                + Add practice location
              </button>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
            <legend className="px-1 text-sm font-medium text-brand-navy">
              Peer references (minimum 3, required)
            </legend>
            <div className="mt-3 overflow-x-auto">
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
                  <ReferenceRowInputs
                    label="Name and title"
                    field="name_title"
                    references={references}
                    onChange={updateReference}
                  />
                  <ReferenceRowInputs
                    label="Phone"
                    field="phone"
                    references={references}
                    onChange={updateReference}
                  />
                  <ReferenceRowInputs
                    label="Email"
                    field="email"
                    references={references}
                    onChange={updateReference}
                  />
                  <ReferenceRowInputs
                    label="Home address or place of employment"
                    field="address"
                    references={references}
                    onChange={updateReference}
                  />
                </tbody>
              </table>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
            <legend className="px-1 text-sm font-medium text-brand-navy">
              Required disclosure information
            </legend>
            <p className="mt-1 text-xs text-slate-500">All &ldquo;yes&rdquo; responses require an explanation.</p>
            <div className="mt-3 flex flex-col gap-5">
              {Object.entries(groupBySection(DISCLOSURE_QUESTIONS)).map(([section, questions]) => (
                <div key={section}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section}</h3>
                  <div className="mt-2 flex flex-col gap-3">
                    {questions.map((q) => {
                      const row = disclosures[q.key];
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
                                    onChange={() => updateDisclosure(q.key, { answer: opt })}
                                  />
                                  {opt === "yes" ? "Yes" : "No"}
                                </label>
                              ))}
                            </div>
                          </div>
                          {row.answer === "yes" && (
                            <input
                              value={row.explanation}
                              onChange={(e) => updateDisclosure(q.key, { explanation: e.target.value })}
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

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save provider"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function groupBySection(
  questions: typeof DISCLOSURE_QUESTIONS
): Record<string, typeof DISCLOSURE_QUESTIONS> {
  const groups: Record<string, typeof DISCLOSURE_QUESTIONS> = {};
  for (const q of questions) {
    groups[q.section] = groups[q.section] ? [...groups[q.section], q] : [q];
  }
  return groups;
}

function ReferenceRowInputs({
  label,
  field,
  references,
  onChange,
}: {
  label: string;
  field: keyof ReferenceRow;
  references: ReferenceRow[];
  onChange: (index: number, field: keyof ReferenceRow, value: string) => void;
}) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3 text-slate-600">{label}</td>
      {references.map((r, i) => (
        <td key={r.ref_number} className="px-3 py-2">
          <input
            value={r[field] as string}
            onChange={(e) => onChange(i, field, e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </td>
      ))}
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5">
      <legend className="px-1 text-sm font-medium text-brand-navy">{title}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  highlighted,
  wide,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  highlighted?: boolean;
  wide?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
        {highlighted && (
          <span className="rounded-full bg-brand-teal-light px-2 py-0.5 text-[10px] font-medium text-brand-teal">
            NPPES
          </span>
        )}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
          readOnly
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-slate-300 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        }`}
      />
    </div>
  );
}
