"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Provider } from "@/lib/types";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => setProviders(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Providers</h1>
        <Link
          href="/providers/new"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark"
        >
          + Add provider
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : providers.length === 0 ? (
        <p className="text-slate-500">No providers yet. Add one to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">NPI</th>
                <th className="px-4 py-2 font-medium">Provider type</th>
                <th className="px-4 py-2 font-medium">Practice address</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-brand-blue-light/40">
                  <td className="px-4 py-2">
                    <Link
                      href={`/providers/${p.id}`}
                      className="font-medium text-brand-navy hover:text-brand-blue hover:underline"
                    >
                      {p.first_name} {p.last_name} {p.credential ? `, ${p.credential}` : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{p.npi}</td>
                  <td className="px-4 py-2 text-slate-600">{p.provider_type ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{p.primary_practice_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
