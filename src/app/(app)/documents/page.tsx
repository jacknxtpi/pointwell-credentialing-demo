"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DOCUMENT_TYPES,
  getExpirationState,
  EXPIRATION_STYLES,
  EXPIRATION_LABELS,
  type ExpirationState,
} from "@/lib/documentTypes";
import type { Provider } from "@/lib/types";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

type DocumentRow = {
  id: number;
  provider_id: number;
  document_type: string;
  status: "on_file" | "on_caqh";
  file_name: string | null;
  expires_date: string | null;
  first_name: string;
  last_name: string;
};

const STATE_ORDER: ExpirationState[] = ["expired", "expiring_soon", "missing", "current", "on_caqh"];

export default function DocumentsPage() {
  const allowed = useRequireAdmin();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [filter, setFilter] = useState<ExpirationState | "all">("all");

  useEffect(() => {
    if (!allowed) return;
    Promise.all([
      fetch("/api/providers").then((r) => r.json()),
      fetch("/api/documents").then((r) => r.json()),
    ]).then(([p, d]) => {
      setProviders(p);
      setDocuments(d);
    });
  }, [allowed]);

  const rows = providers.flatMap((provider) =>
    DOCUMENT_TYPES.map((docType) => {
      const doc = documents.find(
        (d) => d.provider_id === provider.id && d.document_type === docType.key
      );
      const state = getExpirationState(doc?.status, doc?.expires_date);
      return { provider, docType, doc, state };
    })
  );

  const filtered = filter === "all" ? rows : rows.filter((r) => r.state === filter);
  const sorted = [...filtered].sort(
    (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)
  );

  const counts = STATE_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = rows.filter((r) => r.state === s).length;
    return acc;
  }, {});

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Document Expirations
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Every required document across the roster, flagged by expiration status. Expiring soon =
          within 60 days.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" count={rows.length} active={filter === "all"} onClick={() => setFilter("all")} />
        {STATE_ORDER.map((s) => (
          <FilterChip
            key={s}
            label={EXPIRATION_LABELS[s]}
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
              <th className="px-4 py-2 font-medium">Document</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Expires</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ provider, docType, doc, state }) => (
              <tr key={`${provider.id}-${docType.key}`} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link
                    href={`/providers/${provider.id}`}
                    className="font-medium text-brand-navy hover:text-brand-blue hover:underline"
                  >
                    {provider.first_name} {provider.last_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{docType.label}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXPIRATION_STYLES[state]}`}>
                    {EXPIRATION_LABELS[state]}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{doc?.expires_date ?? "—"}</td>
              </tr>
            ))}
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
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-brand-blue bg-brand-blue-light text-brand-blue"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label} ({count})
    </button>
  );
}
