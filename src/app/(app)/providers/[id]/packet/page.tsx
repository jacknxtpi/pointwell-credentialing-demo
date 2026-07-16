"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Provider, Payer, PayerFieldLabel } from "@/lib/types";
import { PACKET_FIELDS } from "@/lib/packetFields";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

export default function PacketPage() {
  const allowed = useRequireAdmin();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const payerId = searchParams.get("payer");
  const providerId = params.id;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [payer, setPayer] = useState<Payer | null>(null);
  const [labels, setLabels] = useState<PayerFieldLabel[]>([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedSsn, setRevealedSsn] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const load = useCallback(async () => {
    if (!payerId) return;
    const [providerRes, payersRes, labelsRes, submissionsRes] = await Promise.all([
      fetch(`/api/providers/${providerId}`),
      fetch("/api/payers"),
      fetch(`/api/payer-field-labels?payer_id=${payerId}`),
      fetch(`/api/submissions?provider_id=${providerId}`),
    ]);
    setProvider(await providerRes.json());
    const payers: Payer[] = await payersRes.json();
    setPayer(payers.find((p) => p.id === Number(payerId)) ?? null);
    setLabels(await labelsRes.json());
    const submissions = await submissionsRes.json();
    setAlreadySubmitted(submissions.some((s: { payer_id: number }) => s.payer_id === Number(payerId)));
  }, [providerId, payerId]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function handleDownload() {
    setError(null);
    if (!alreadySubmitted) {
      setRegistering(true);
      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider_id: Number(providerId), payer_id: Number(payerId) }),
        });
        if (res.ok) {
          setAlreadySubmitted(true);
        } else {
          const data = await res.json();
          setError(data.error ?? "Failed to register submission.");
        }
      } finally {
        setRegistering(false);
      }
    }
    window.print();
  }

  async function revealSsn() {
    setRevealing(true);
    try {
      const res = await fetch(`/api/providers/${providerId}/reveal-ssn?payer_id=${payerId}`);
      const data = await res.json();
      if (res.ok) setRevealedSsn(data.ssn);
    } finally {
      setRevealing(false);
    }
  }

  if (!allowed) return null;
  if (!payerId) {
    return <p className="text-slate-500">No payer selected.</p>;
  }
  if (!provider || !payer) {
    return <p className="text-slate-500">Loading…</p>;
  }

  const labelFor = (key: string, fallback: string) => {
    const custom = labels.find((l) => l.field_key === key)?.label;
    return custom || fallback;
  };
  const isIncluded = (key: string) => labels.find((l) => l.field_key === key)?.included !== 0;
  const visibleFields = PACKET_FIELDS.filter((f) => isIncluded(f.key));

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex items-center justify-between">
        <Link href={`/providers/${providerId}`} className="text-sm text-brand-blue hover:underline">
          ← Back to provider
        </Link>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleDownload}
            disabled={registering}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-40"
          >
            {alreadySubmitted ? "Print / Download PDF" : "Download & register as pending"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Credentialing submission packet</p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-navy">{payer.name}</h1>
          <p className="mt-1 text-slate-600">
            {provider.first_name} {provider.middle_name ? `${provider.middle_name} ` : ""}
            {provider.last_name}
            {provider.credential ? `, ${provider.credential}` : ""} · NPI {provider.npi}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {visibleFields.map((f) => {
            const value = f.key === "ssn" && revealedSsn ? revealedSsn : f.getValue(provider);
            return (
              <div key={f.key} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
                <dt className="text-slate-500">{labelFor(f.key, f.label)}</dt>
                <dd className="flex items-center gap-2 text-right font-medium text-brand-navy">
                  {value ?? "—"}
                  {f.key === "ssn" && !revealedSsn && (
                    <button
                      type="button"
                      onClick={revealSsn}
                      disabled={revealing}
                      className="no-print rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-normal text-brand-blue hover:bg-brand-blue-light disabled:opacity-40"
                    >
                      {revealing ? "…" : "Reveal"}
                    </button>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="no-print mt-4 text-xs text-slate-400">
          SSN is masked by default. Revealing it is logged (who, when, and for which payer).
        </p>
      </div>
    </div>
  );
}
