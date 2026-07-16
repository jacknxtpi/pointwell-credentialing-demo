"use client";

import { useEffect, useState, useCallback } from "react";
import type { Payer, LineOfBusiness, Plan, Provider } from "@/lib/types";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

type NetworkStatusRow = {
  id: number;
  provider_id: number;
  plan_id: number;
  status: "in_network" | "not_in_network";
  confirmation_source: string | null;
  effective_date: string | null;
  last_verified_date: string | null;
  notes: string | null;
  first_name: string;
  last_name: string;
};

const CONFIRMATION_SOURCES = [
  { value: "email", label: "Email" },
  { value: "payer_portal", label: "Payer portal" },
  { value: "public_directory", label: "Public directory" },
  { value: "phone_follow_up", label: "Phone/email follow-up" },
];

const STATUS_STYLES: Record<string, string> = {
  in_network: "bg-brand-teal-light text-brand-teal",
  not_in_network: "bg-red-100 text-red-800",
};

export default function NetworkPage() {
  const allowed = useRequireAdmin();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [linesOfBusiness, setLinesOfBusiness] = useState<LineOfBusiness[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [statuses, setStatuses] = useState<NetworkStatusRow[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  const refresh = useCallback(async () => {
    const [payersRes, lobRes, plansRes, statusesRes, providersRes] = await Promise.all([
      fetch("/api/payers"),
      fetch("/api/lines-of-business"),
      fetch("/api/plans"),
      fetch("/api/network-statuses"),
      fetch("/api/providers"),
    ]);
    setPayers(await payersRes.json());
    setLinesOfBusiness(await lobRes.json());
    setPlans(await plansRes.json());
    setStatuses(await statusesRes.json());
    setProviders(await providersRes.json());
  }, []);

  useEffect(() => {
    if (allowed) refresh();
  }, [allowed, refresh]);

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Network Status</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Payer → line of business → plan. Populated gradually as network status is confirmed
          through approved contracts and directory research — not every plan will have data yet.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {payers.map((payer) => (
          <PayerCard
            key={payer.id}
            payer={payer}
            linesOfBusiness={linesOfBusiness.filter((l) => l.payer_id === payer.id)}
            plans={plans}
            statuses={statuses}
            providers={providers}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  );
}

function PayerCard({
  payer,
  linesOfBusiness,
  plans,
  statuses,
  providers,
  onChanged,
}: {
  payer: Payer;
  linesOfBusiness: LineOfBusiness[];
  plans: Plan[];
  statuses: NetworkStatusRow[];
  providers: Provider[];
  onChanged: () => void;
}) {
  const [newLobName, setNewLobName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addLineOfBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!newLobName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/lines-of-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payer_id: payer.id, name: newLobName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add line of business.");
        return;
      }
      setNewLobName("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-brand-navy">{payer.name}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {payer.payer_type}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3 border-l-2 border-slate-100 pl-4">
        {linesOfBusiness.length === 0 && (
          <p className="text-sm text-slate-400">No lines of business added yet.</p>
        )}
        {linesOfBusiness.map((lob) => (
          <LineOfBusinessSection
            key={lob.id}
            lob={lob}
            plans={plans.filter((p) => p.line_of_business_id === lob.id)}
            statuses={statuses}
            providers={providers}
            onChanged={onChanged}
          />
        ))}

        <form onSubmit={addLineOfBusiness} className="flex items-center gap-2">
          <input
            value={newLobName}
            onChange={(e) => setNewLobName(e.target.value)}
            placeholder="e.g. Commercial, Medicare Advantage, Medicaid Managed Care"
            className="w-72 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          <button
            type="submit"
            disabled={saving || !newLobName.trim()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue-light disabled:opacity-40"
          >
            + Add line of business
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}

function LineOfBusinessSection({
  lob,
  plans,
  statuses,
  providers,
  onChanged,
}: {
  lob: LineOfBusiness;
  plans: Plan[];
  statuses: NetworkStatusRow[];
  providers: Provider[];
  onChanged: () => void;
}) {
  const [newPlanName, setNewPlanName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_of_business_id: lob.id, name: newPlanName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add plan.");
        return;
      }
      setNewPlanName("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <h3 className="text-sm font-semibold text-brand-navy">{lob.name}</h3>
      <div className="mt-2 flex flex-col gap-3 border-l-2 border-slate-200 pl-4">
        {plans.length === 0 && <p className="text-xs text-slate-400">No plans added yet.</p>}
        {plans.map((plan) => (
          <PlanSection
            key={plan.id}
            plan={plan}
            statuses={statuses.filter((s) => s.plan_id === plan.id)}
            providers={providers}
            onChanged={onChanged}
          />
        ))}

        <form onSubmit={addPlan} className="flex items-center gap-2">
          <input
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            placeholder="Plan name"
            className="w-64 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          <button
            type="submit"
            disabled={saving || !newPlanName.trim()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue-light disabled:opacity-40"
          >
            + Add plan
          </button>
        </form>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function PlanSection({
  plan,
  statuses,
  providers,
  onChanged,
}: {
  plan: Plan;
  statuses: NetworkStatusRow[];
  providers: Provider[];
  onChanged: () => void;
}) {
  const [providerId, setProviderId] = useState("");
  const [status, setStatus] = useState<"in_network" | "not_in_network">("in_network");
  const [confirmationSource, setConfirmationSource] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setProviderStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/network-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: Number(providerId),
          plan_id: plan.id,
          status,
          confirmation_source: confirmationSource || null,
          effective_date: effectiveDate || null,
          last_verified_date: new Date().toISOString().slice(0, 10),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save status.");
        return;
      }
      setProviderId("");
      setConfirmationSource("");
      setEffectiveDate("");
      setNotes("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-700">{plan.name}</p>

      {statuses.length > 0 && (
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Provider</th>
              <th className="py-1 pr-3 font-medium">Status</th>
              <th className="py-1 pr-3 font-medium">Source</th>
              <th className="py-1 pr-3 font-medium">Effective</th>
              <th className="py-1 font-medium">Last verified</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="py-1 pr-3">
                  {s.first_name} {s.last_name}
                </td>
                <td className="py-1 pr-3">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[s.status]}`}>
                    {s.status === "in_network" ? "in-network" : "not in-network"}
                  </span>
                </td>
                <td className="py-1 pr-3 text-slate-600">
                  {CONFIRMATION_SOURCES.find((c) => c.value === s.confirmation_source)?.label ?? "—"}
                </td>
                <td className="py-1 pr-3 text-slate-600">{s.effective_date ?? "—"}</td>
                <td className="py-1 text-slate-600">{s.last_verified_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={setProviderStatus} className="mt-2 flex flex-wrap items-end gap-2">
        <select
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="">Provider…</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.last_name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "in_network" | "not_in_network")}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="in_network">In-network</option>
          <option value="not_in_network">Not in-network</option>
        </select>
        <select
          value={confirmationSource}
          onChange={(e) => setConfirmationSource(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="">Confirmed via…</option>
          {CONFIRMATION_SOURCES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          title="Effective date"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        <button
          type="submit"
          disabled={saving || !providerId}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40"
        >
          Save status
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
