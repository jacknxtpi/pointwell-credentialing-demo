"use client";

import { useCallback, useEffect, useState } from "react";
import type { Payer, PayerFieldLabel, CustomPacketField } from "@/lib/types";
import { PACKET_FIELDS } from "@/lib/packetFields";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

const PAYER_TYPES = [
  { value: "commercial", label: "Commercial" },
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid" },
];

export default function PayersPage() {
  const allowed = useRequireAdmin();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [labels, setLabels] = useState<PayerFieldLabel[]>([]);
  const [customFields, setCustomFields] = useState<CustomPacketField[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("commercial");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [p, l, cf] = await Promise.all([
      fetch("/api/payers").then((r) => r.json()),
      fetch("/api/payer-field-labels").then((r) => r.json()),
      fetch("/api/custom-packet-fields").then((r) => r.json()),
    ]);
    setPayers(p);
    setLabels(l);
    setCustomFields(cf);
  }, []);

  useEffect(() => {
    if (allowed) refresh();
  }, [allowed, refresh]);

  async function addPayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/payers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), payer_type: newType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add payer.");
        return;
      }
      setPayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewType("commercial");
    } finally {
      setAdding(false);
    }
  }

  async function saveSchemaField(payerId: number, fieldKey: string, label: string, included: boolean) {
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

  async function saveCustomField(customFieldId: number, label: string, included: boolean) {
    const res = await fetch(`/api/custom-packet-fields/${customFieldId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, included }),
    });
    const data = await res.json();
    setCustomFields((prev) => prev.map((cf) => (cf.id === customFieldId ? data : cf)));
  }

  type CombinedField = {
    key: string;
    label: string;
    isCustom: boolean;
    customFieldId?: number;
    customIncluded?: number;
    customSortOrder?: number | null;
  };

  function getOrderedFields(payerId: number): CombinedField[] {
    const combined: CombinedField[] = [
      ...PACKET_FIELDS.map((f) => ({ key: f.key, label: f.label, isCustom: false })),
      ...customFields
        .filter((cf) => cf.payer_id === payerId)
        .map((cf) => ({
          key: cf.field_key,
          label: cf.label,
          isCustom: true,
          customFieldId: cf.id,
          customIncluded: cf.included,
          customSortOrder: cf.sort_order,
        })),
    ];
    return combined
      .map((f, naturalIndex) => {
        const sortOrder = f.isCustom
          ? f.customSortOrder ?? naturalIndex
          : labels.find((l) => l.payer_id === payerId && l.field_key === f.key)?.sort_order ?? naturalIndex;
        return { field: f, sortOrder, naturalIndex };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.naturalIndex - b.naturalIndex)
      .map((w) => w.field);
  }

  async function setSortOrderFor(payerId: number, field: CombinedField, sortOrder: number) {
    if (field.isCustom && field.customFieldId) {
      await fetch(`/api/custom-packet-fields/${field.customFieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: sortOrder }),
      });
    } else {
      await fetch("/api/payer-field-labels/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payer_id: payerId, fields: [{ field_key: field.key, sort_order: sortOrder }] }),
      });
    }
  }

  async function moveField(payerId: number, index: number, direction: -1 | 1) {
    const ordered = getOrderedFields(payerId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    await Promise.all([
      setSortOrderFor(payerId, ordered[index], targetIndex),
      setSortOrderFor(payerId, ordered[targetIndex], index),
    ]);
    refresh();
  }

  async function deleteCustomField(customFieldId: number, label: string) {
    if (!window.confirm(`Delete "${label}"? This only affects this payer.`)) return;
    await fetch(`/api/custom-packet-fields/${customFieldId}`, { method: "DELETE" });
    refresh();
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

      <form
        onSubmit={addPayer}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div>
          <label className="block text-xs font-medium text-slate-700">Payer name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Avera Health Plans"
            className="mt-1 w-64 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {PAYER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40"
        >
          + Add payer
        </button>
        {addError && <p className="w-full text-sm text-red-600">{addError}</p>}
      </form>

      <div className="flex flex-col gap-3">
        {payers.map((payer) => (
          <div key={payer.id} className="rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setExpanded(expanded === payer.id ? null : payer.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="flex items-center gap-2 font-medium text-brand-navy">
                {payer.name}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                  {payer.payer_type}
                </span>
              </span>
              <span className="text-xs text-slate-500">
                {expanded === payer.id ? "Hide field labels ▲" : "Edit field labels ▼"}
              </span>
            </button>

            {expanded === payer.id && (
              <div className="border-t border-slate-100 p-5">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="w-16 py-1 pr-2 font-medium">Order</th>
                      <th className="w-16 py-1 pr-2 font-medium">Include</th>
                      <th className="py-1 pr-4 font-medium">Our field</th>
                      <th className="py-1 font-medium">{payer.name}&rsquo;s label</th>
                      <th className="w-16 py-1 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getOrderedFields(payer.id).map((f, index, ordered) => {
                      const currentLabel = f.isCustom
                        ? f.label
                        : labels.find((l) => l.payer_id === payer.id && l.field_key === f.key)?.label ?? "";
                      const currentIncluded = f.isCustom
                        ? f.customIncluded !== 0
                        : (labels.find((l) => l.payer_id === payer.id && l.field_key === f.key)?.included ?? 1) !== 0;
                      return (
                        <FieldLabelRow
                          key={f.key}
                          defaultLabel={f.label}
                          currentLabel={currentLabel}
                          currentIncluded={currentIncluded}
                          isCustom={f.isCustom}
                          canMoveUp={index > 0}
                          canMoveDown={index < ordered.length - 1}
                          onSave={(label, included) =>
                            f.isCustom && f.customFieldId
                              ? saveCustomField(f.customFieldId, label, included)
                              : saveSchemaField(payer.id, f.key, label, included)
                          }
                          onMove={(direction) => moveField(payer.id, index, direction)}
                          onDelete={() => f.customFieldId && deleteCustomField(f.customFieldId, f.label)}
                        />
                      );
                    })}
                  </tbody>
                </table>

                <AddCustomFieldForm payerId={payer.id} onAdded={refresh} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldLabelRow({
  defaultLabel,
  currentLabel,
  currentIncluded,
  isCustom,
  canMoveUp,
  canMoveDown,
  onSave,
  onMove,
  onDelete,
}: {
  defaultLabel: string;
  currentLabel: string;
  currentIncluded: boolean;
  isCustom: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSave: (label: string, included: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(currentLabel);
  const [included, setIncluded] = useState(currentIncluded);

  return (
    <tr className="border-t border-slate-100">
      <td className="py-1.5 pr-2">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            title="Move up"
            className="rounded border border-slate-300 px-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            title="Move down"
            className="rounded border border-slate-300 px-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="checkbox"
          checked={included}
          onChange={(e) => {
            const next = e.target.checked;
            setIncluded(next);
            onSave(value, next);
          }}
        />
      </td>
      <td className={`py-1.5 pr-4 ${included ? "text-slate-600" : "text-slate-400 line-through"}`}>
        {defaultLabel}
        {isCustom && (
          <span className="ml-1.5 rounded-full bg-brand-blue-light px-1.5 py-0.5 text-[10px] font-medium text-brand-blue">
            custom
          </span>
        )}
      </td>
      <td className="py-1.5">
        <input
          value={value}
          disabled={!included}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value !== currentLabel) onSave(value, included);
          }}
          placeholder={defaultLabel}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-50 disabled:text-slate-400"
        />
      </td>
      <td className="py-1.5 text-right">
        {isCustom && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete this custom field (only affects this payer)"
            className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

function AddCustomFieldForm({ payerId, onAdded }: { payerId: number; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addField(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-packet-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), payer_id: payerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add field.");
        return;
      }
      setLabel("");
      onAdded();
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={addField} className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New field this payer asks for, e.g. Malpractice tail coverage amount"
        className="w-96 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />
      <button
        type="submit"
        disabled={adding || !label.trim()}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue-light disabled:opacity-40"
      >
        + Add custom field
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
