"use client";

import { useEffect, useState } from "react";
import type { Payer, PayerFieldLabel } from "@/lib/types";
import { PACKET_FIELDS } from "@/lib/packetFields";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

export default function PayersPage() {
  const allowed = useRequireAdmin();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [labels, setLabels] = useState<PayerFieldLabel[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!allowed) return;
    Promise.all([
      fetch("/api/payers").then((r) => r.json()),
      fetch("/api/payer-field-labels").then((r) => r.json()),
    ]).then(([p, l]) => {
      setPayers(p);
      setLabels(l);
    });
  }, [allowed]);

  async function saveField(payerId: number, fieldKey: string, label: string, included: boolean) {
    const res = await fetch("/api/payer-field-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payer_id: payerId, field_key: fieldKey, label, included }),
    });
    const data = await res.json();
    setLabels((prev) => {
      const withoutThis = prev.filter(
        (l) => !(l.payer_id === payerId && l.field_key === fieldKey)
      );
      return data.deleted ? withoutThis : [...withoutThis, data];
    });
  }

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Payers</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Rename any field to match how that payer&rsquo;s own form labels it, or uncheck a field
          that payer&rsquo;s form doesn&rsquo;t ask for at all. Submission packets for that payer
          will reflect both.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {payers.map((payer) => (
          <div key={payer.id} className="rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setExpanded(expanded === payer.id ? null : payer.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-medium text-brand-navy">{payer.name}</span>
              <span className="text-xs text-slate-500">
                {expanded === payer.id ? "Hide field labels ▲" : "Edit field labels ▼"}
              </span>
            </button>

            {expanded === payer.id && (
              <div className="border-t border-slate-100 p-5">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="w-16 py-1 pr-2 font-medium">Include</th>
                      <th className="py-1 pr-4 font-medium">Our field</th>
                      <th className="py-1 font-medium">{payer.name}&rsquo;s label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PACKET_FIELDS.map((f) => {
                      const existing = labels.find(
                        (l) => l.payer_id === payer.id && l.field_key === f.key
                      );
                      return (
                        <FieldLabelRow
                          key={f.key}
                          payerId={payer.id}
                          fieldKey={f.key}
                          defaultLabel={f.label}
                          currentLabel={existing?.label ?? ""}
                          currentIncluded={existing ? existing.included !== 0 : true}
                          onSave={saveField}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldLabelRow({
  payerId,
  fieldKey,
  defaultLabel,
  currentLabel,
  currentIncluded,
  onSave,
}: {
  payerId: number;
  fieldKey: string;
  defaultLabel: string;
  currentLabel: string;
  currentIncluded: boolean;
  onSave: (payerId: number, fieldKey: string, label: string, included: boolean) => void;
}) {
  const [value, setValue] = useState(currentLabel);
  const [included, setIncluded] = useState(currentIncluded);

  return (
    <tr className="border-t border-slate-100">
      <td className="py-1.5 pr-2">
        <input
          type="checkbox"
          checked={included}
          onChange={(e) => {
            const next = e.target.checked;
            setIncluded(next);
            onSave(payerId, fieldKey, value, next);
          }}
        />
      </td>
      <td className={`py-1.5 pr-4 ${included ? "text-slate-600" : "text-slate-400 line-through"}`}>
        {defaultLabel}
      </td>
      <td className="py-1.5">
        <input
          value={value}
          disabled={!included}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value !== currentLabel) onSave(payerId, fieldKey, value, included);
          }}
          placeholder={defaultLabel}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-50 disabled:text-slate-400"
        />
      </td>
    </tr>
  );
}
