"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Provider, Payer } from "@/lib/types";

type SubmissionRow = {
  id: number;
  provider_id: number;
  payer_id: number;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  effective_date: string | null;
  notes: string | null;
  payer_name: string;
  payer_type: string;
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-brand-blue-light text-brand-blue",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-brand-teal-light text-brand-teal",
  denied: "bg-red-100 text-red-800",
  terminated: "bg-slate-200 text-slate-700",
};

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const providerId = params.id;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [selectedPayer, setSelectedPayer] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [providerRes, subsRes, payersRes] = await Promise.all([
      fetch(`/api/providers/${providerId}`),
      fetch(`/api/submissions?provider_id=${providerId}`),
      fetch("/api/payers"),
    ]);
    setProvider(await providerRes.json());
    setSubmissions(await subsRes.json());
    setPayers(await payersRes.json());
  }, [providerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submitToPayer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPayer) return;
    setSubmitError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: Number(providerId), payer_id: Number(selectedPayer) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to submit.");
        return;
      }
      setSelectedPayer("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function advance(submissionId: number) {
    setBusy(true);
    try {
      await fetch(`/api/submissions/${submissionId}/advance`, { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!provider) return <p className="text-slate-500">Loading…</p>;

  const availablePayers = payers.filter((p) => !submissions.some((s) => s.payer_id === p.id));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          {provider.first_name} {provider.last_name}
          {provider.credential ? `, ${provider.credential}` : ""}
        </h1>
        <p className="text-slate-600">
          NPI {provider.npi} · {provider.provider_type ?? "Provider type unknown"}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">Provider details</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Practice address" value={provider.primary_practice_address} />
          <Detail label="Practice phone" value={provider.primary_practice_phone} />
          <Detail label="Work email" value={provider.work_email} />
          <Detail label="Home address" value={provider.home_address} />
          <Detail label="Individual Medicare PTAN" value={provider.medicare_ptan_individual} />
          <Detail label="RR Medicare PTAN" value={provider.medicare_ptan_reassignment} />
          <Detail label="Medicaid PTAN" value={provider.medicaid_ptan_individual} />
          <Detail label="CAQH #" value={provider.caqh_number} />
          <Detail label="License #" value={provider.license_number} suffix={provider.license_state ?? undefined} />
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
          <Detail label="DOB" value={provider.dob} />
          <Detail label="SSN" value={provider.ssn} />
          <Detail label="Hire date" value={provider.hire_date} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">Payer submissions</h2>
        <p className="mt-1 text-sm text-amber-700">
          Simulated — no real payer is contacted by this demo.
        </p>

        {submissions.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Payer</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Submitted</th>
                <th className="py-2 pr-4 font-medium">Effective date</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{s.payer_name}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status] ?? ""}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{s.submitted_at.slice(0, 10)}</td>
                  <td className="py-2 pr-4 text-slate-600">{s.effective_date ?? "—"}</td>
                  <td className="py-2 text-right">
                    {(s.status === "submitted" || s.status === "pending") && (
                      <button
                        onClick={() => advance(s.id)}
                        disabled={busy}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-brand-navy hover:bg-brand-blue-light hover:border-brand-blue disabled:opacity-40"
                      >
                        Simulate payer response →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={submitToPayer} className="mt-4 flex items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Submit to payer</label>
            <select
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="">Select a payer…</option>
              {availablePayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!selectedPayer || busy}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-40"
          >
            Submit application
          </button>
        </form>
        {submitError && <p className="mt-2 text-sm text-red-600">{submitError}</p>}
      </section>
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
