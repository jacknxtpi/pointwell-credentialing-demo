"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NpiLookupResult } from "@/lib/npi";

const emptyForm = {
  npi: "",
  first_name: "",
  last_name: "",
  credential: "",
  provider_type: "",
  primary_practice_address: "",
  primary_practice_phone: "",
  work_email: "",
  home_address: "",
  medicare_ptan_individual: "",
  medicare_ptan_reassignment: "",
  medicaid_ptan_individual: "",
  license_number: "",
  license_state: "",
  dea_number: "",
  board_certification_number: "",
  controlled_substance_number: "",
  caqh_number: "",
  liability_ins_start: "",
  liability_ins_end: "",
  dob: "",
  ssn: "",
  hire_date: "",
};

type FormState = typeof emptyForm;

const NPPES_FIELDS = new Set([
  "first_name",
  "last_name",
  "credential",
  "provider_type",
  "primary_practice_address",
  "primary_practice_phone",
]);

export default function NewProviderPage() {
  const router = useRouter();
  const [npiInput, setNpiInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
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
        provider_type: result.providerType ?? "",
        primary_practice_address: result.practiceAddress ?? "",
        primary_practice_phone: result.practicePhone ?? "",
        license_number: result.licenseNumber ?? "",
        license_state: result.licenseState ?? "",
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Add a Provider</h1>
        <p className="mt-2 text-slate-600">
          Step 1 pulls what it can from the real NPPES NPI Registry. Step 2 fills in the fields
          no public registry has — please use synthetic data for SSN, DOB, DEA #, and license #
          in this demo.
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
            <Field
              label="First name"
              value={form.first_name}
              onChange={(v) => update("first_name", v)}
              highlighted={NPPES_FIELDS.has("first_name")}
            />
            <Field
              label="Last name"
              value={form.last_name}
              onChange={(v) => update("last_name", v)}
              highlighted
            />
            <Field
              label="Credential"
              value={form.credential}
              onChange={(v) => update("credential", v)}
              highlighted
            />
            <Field
              label="Provider type"
              value={form.provider_type}
              onChange={(v) => update("provider_type", v)}
              highlighted
            />
            <Field
              label="Primary practice address"
              value={form.primary_practice_address}
              onChange={(v) => update("primary_practice_address", v)}
              highlighted
              wide
            />
            <Field
              label="Practice phone"
              value={form.primary_practice_phone}
              onChange={(v) => update("primary_practice_phone", v)}
              highlighted
            />
          </Section>

          <Section title="Contact & internal (manual entry)">
            <Field label="Work email" value={form.work_email} onChange={(v) => update("work_email", v)} />
            <Field label="Home address" value={form.home_address} onChange={(v) => update("home_address", v)} wide />
            <Field label="Hire date" value={form.hire_date} onChange={(v) => update("hire_date", v)} type="date" />
            <Field label="Date of birth" value={form.dob} onChange={(v) => update("dob", v)} type="date" />
            <Field
              label="SSN (synthetic only)"
              value={form.ssn}
              onChange={(v) => update("ssn", v)}
              placeholder="e.g. 000-00-0000"
            />
          </Section>

          <Section title="Payer / government identifiers (manual entry)">
            <Field
              label="Individual Medicare PTAN"
              value={form.medicare_ptan_individual}
              onChange={(v) => update("medicare_ptan_individual", v)}
            />
            <Field
              label="Reassignment (RR) Medicare PTAN"
              value={form.medicare_ptan_reassignment}
              onChange={(v) => update("medicare_ptan_reassignment", v)}
            />
            <Field
              label="Individual Medicaid PTAN"
              value={form.medicaid_ptan_individual}
              onChange={(v) => update("medicaid_ptan_individual", v)}
            />
            <Field label="CAQH #" value={form.caqh_number} onChange={(v) => update("caqh_number", v)} />
          </Section>

          <Section title="Licensure & credentials (manual entry)">
            <Field
              label="License #"
              value={form.license_number}
              onChange={(v) => update("license_number", v)}
              highlighted={!!form.license_number}
            />
            <Field
              label="License state"
              value={form.license_state}
              onChange={(v) => update("license_state", v)}
              highlighted={!!form.license_state}
            />
            <Field label="DEA #" value={form.dea_number} onChange={(v) => update("dea_number", v)} />
            <Field
              label="Board certification #"
              value={form.board_certification_number}
              onChange={(v) => update("board_certification_number", v)}
            />
            <Field
              label="Controlled substance #"
              value={form.controlled_substance_number}
              onChange={(v) => update("controlled_substance_number", v)}
            />
            <Field
              label="Liability insurance start"
              value={form.liability_ins_start}
              onChange={(v) => update("liability_ins_start", v)}
              type="date"
            />
            <Field
              label="Liability insurance end"
              value={form.liability_ins_end}
              onChange={(v) => update("liability_ins_end", v)}
              type="date"
            />
          </Section>

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
