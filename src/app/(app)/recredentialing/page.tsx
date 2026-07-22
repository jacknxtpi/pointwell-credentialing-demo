"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getRecredentialingState,
  RECRED_STYLES,
  RECRED_LABELS,
  type RecredentialingState,
} from "@/lib/recredentialing";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

type SubmissionRow = {
  id: number;
  provider_id: number;
  payer_id: number;
  status: string;
  approved_through: string | null;
  first_name: string;
  last_name: string;
  payer_name: string;
};

const STATE_ORDER: RecredentialingState[] = ["overdue", "due_soon", "no_date", "current", "not_applicable"];

export default function RecredentialingPage() {
  const allowed = useRequireAdmin();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [filter, setFilter] = useState<RecredentialingState | "all">("all");

  useEffect(() => {
    if (!allowed) return;
    fetch("/api/submissions")
      .then((r) => r.json())
      .then(setSubmissions);
  }, [allowed]);

  const rows = submissions.map((s) => ({
    submission: s,
    state: getRecredentialingState(s.status, s.approved_through),
  }));

  const filtered = filter === "all" ? rows : rows.filter((r) => r.state === filter);
  const sorted = [...filtered].sort((a, b) => {
    const stateDiff = STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state);
    if (stateDiff !== 0) return stateDiff;
    return (a.submission.approved_through ?? "").localeCompare(b.submission.approved_through ?? "");
  });

  const counts = STATE_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = rows.filter((r) => r.state === s).length;
    return acc;
  }, {});

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Recredentialing</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Every approved payer submission, flagged by how close it is to its recredentialing due
          date (the &ldquo;approved through&rdquo; date set on approval). Due soon = within 90 days.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" count={rows.length} active={filter === "all"} onClick={() => setFilter("all")} />
        {STATE_ORDER.map((s) => (
          <FilterChip
            key={s}
            label={RECRED_LABELS[s]}
            count={counts[s]}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Payer</th>
              <th className="px-4 py-2 font-medium">Submission status</th>
              <th className="px-4 py-2 font-medium">Approved through</th>
              <th className="px-4 py-2 font-medium">Recredentialing</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ submission: s, state }) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/providers/${s.provider_id}`}
                    className="font-medium text-brand-navy hover:text-brand-blue hover:underline"
                  >
                    {s.first_name} {s.last_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{s.payer_name}</td>
                <td className="px-4 py-2 text-slate-600">{s.status}</td>
                <td className="px-4 py-2 text-slate-600">{s.approved_through ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RECRED_STYLES[state]}`}>
                    {RECRED_LABELS[state]}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nothing in this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "border-brand-blue bg-brand-blue-light text-brand-blue"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label} ({count})
    </button>
  );
}
