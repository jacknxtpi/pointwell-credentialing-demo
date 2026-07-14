"use client";

import { useEffect, useMemo, useState } from "react";
import type { Provider, Payer } from "@/lib/types";

type SubmissionRow = {
  id: number;
  provider_id: number;
  payer_id: number;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  effective_date: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-brand-blue-light text-brand-blue",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-brand-teal-light text-brand-teal",
  denied: "bg-red-100 text-red-800",
  terminated: "bg-slate-200 text-slate-700",
  "not submitted": "bg-slate-100 text-slate-500",
};

export default function LookupPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [providerId, setProviderId] = useState("");
  const [payerId, setPayerId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/providers").then((r) => r.json()),
      fetch("/api/payers").then((r) => r.json()),
      fetch("/api/submissions").then((r) => r.json()),
    ]).then(([p, pay, subs]) => {
      setProviders(p);
      setPayers(pay);
      setSubmissions(subs);
    });
  }, []);

  const match = useMemo(
    () =>
      submissions.find(
        (s) => String(s.provider_id) === providerId && String(s.payer_id) === payerId
      ),
    [submissions, providerId, payerId]
  );

  const selectedProvider = providers.find((p) => String(p.id) === providerId);
  const selectedPayer = payers.find((p) => String(p.id) === payerId);

  function answer() {
    if (!selectedProvider || !selectedPayer) return null;
    if (!match) {
      return {
        style: STATUS_STYLES["not submitted"],
        text: `No application on file for ${selectedPayer.name}.`,
      };
    }
    if (match.status === "approved") {
      return {
        style: STATUS_STYLES.approved,
        text: `Yes — approved / in-network with ${selectedPayer.name}, effective ${match.effective_date}.`,
      };
    }
    if (match.status === "denied") {
      return { style: STATUS_STYLES.denied, text: `No — application to ${selectedPayer.name} was denied.` };
    }
    if (match.status === "pending") {
      return {
        style: STATUS_STYLES.pending,
        text: `Not yet — application to ${selectedPayer.name} is pending (submitted ${match.submitted_at.slice(0, 10)}).`,
      };
    }
    return {
      style: STATUS_STYLES.submitted,
      text: `Not yet — application to ${selectedPayer.name} was just submitted, awaiting review.`,
    };
  }

  const result = answer();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Provider Status Lookup
        </h1>
        <p className="mt-2 text-slate-600">
          &ldquo;Is Dr. X an approved / in-network provider under Payer Y?&rdquo;
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Provider</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="">Select a provider…</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Payer</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="">Select a payer…</option>
              {payers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {result && (
          <div className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${result.style}`}>
            {result.text}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-brand-navy">Full status matrix</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Provider</th>
                {payers.map((pay) => (
                  <th key={pay.id} className="px-4 py-2 font-medium">
                    {pay.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map((prov) => (
                <tr key={prov.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-medium text-brand-navy">
                    {prov.first_name} {prov.last_name}
                  </td>
                  {payers.map((pay) => {
                    const s = submissions.find(
                      (x) => x.provider_id === prov.id && x.payer_id === pay.id
                    );
                    const status = s?.status ?? "not submitted";
                    return (
                      <td key={pay.id} className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
