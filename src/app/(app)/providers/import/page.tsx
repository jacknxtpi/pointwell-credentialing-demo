"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { PROVIDER_IMPORT_FIELDS, suggestMapping } from "@/lib/providerImportFields";
import { useRequireAdmin } from "@/lib/useRequireAdmin";

type Step = "upload" | "map" | "preview" | "done";

type ValidatedRow = {
  index: number;
  mappedRow: Record<string, string>;
  errors: string[];
  isDuplicate: boolean;
};

type ImportResult = {
  summary: { created: number; updated: number; skipped: number; error: number };
  results: { row: number; npi: string | null; status: string; message?: string }[];
};

const REQUIRED_FIELDS = PROVIDER_IMPORT_FIELDS.filter((f) => f.required);

export default function ImportProvidersPage() {
  const allowed = useRequireAdmin();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [existingNpis, setExistingNpis] = useState<Set<string>>(new Set());
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setParseError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) {
          setParseError("No rows found in this file.");
          return;
        }
        const headers = result.meta.fields ?? [];
        const used = new Set<string>();
        const initialMapping: Record<string, string> = {};
        for (const h of headers) {
          const suggestion = suggestMapping(h, used);
          initialMapping[h] = suggestion ?? "";
          if (suggestion) used.add(suggestion);
        }
        setCsvHeaders(headers);
        setCsvRows(result.data);
        setMapping(initialMapping);
        setFileName(file.name);
        setStep("map");
      },
      error: (err) => setParseError(err.message),
    });
  }

  function setColumnMapping(header: string, fieldKey: string) {
    setMapping((prev) => ({ ...prev, [header]: fieldKey }));
  }

  function downloadTemplate() {
    const csv = Papa.unparse([PROVIDER_IMPORT_FIELDS.map((f) => f.label)]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "provider_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const usedFieldKeys = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = REQUIRED_FIELDS.filter((f) => !usedFieldKeys.has(f.key));

  async function goToPreview() {
    const res = await fetch("/api/providers");
    const providers: { npi: string }[] = await res.json();
    setExistingNpis(new Set(providers.map((p) => p.npi)));
    setStep("preview");
  }

  function buildValidatedRows(): ValidatedRow[] {
    const seen = new Set<string>();
    return csvRows.map((raw, index) => {
      const mappedRow: Record<string, string> = {};
      for (const [header, fieldKey] of Object.entries(mapping)) {
        if (!fieldKey) continue;
        mappedRow[fieldKey] = (raw[header] ?? "").trim();
      }
      const errors: string[] = [];
      if (!mappedRow.npi) errors.push("Missing NPI");
      if (!mappedRow.first_name) errors.push("Missing first name");
      if (!mappedRow.last_name) errors.push("Missing last name");
      if (mappedRow.npi && !/^\d{10}$/.test(mappedRow.npi)) errors.push("NPI must be 10 digits");
      if (mappedRow.npi) {
        if (seen.has(mappedRow.npi)) errors.push("Duplicate NPI within this file");
        seen.add(mappedRow.npi);
      }
      const isDuplicate = !!mappedRow.npi && existingNpis.has(mappedRow.npi);
      return { index, mappedRow, errors, isDuplicate };
    });
  }

  const validatedRows = step === "preview" || step === "done" ? buildValidatedRows() : [];
  const validRows = validatedRows.filter((r) => r.errors.length === 0);
  const errorRows = validatedRows.filter((r) => r.errors.length > 0);
  const duplicateCount = validRows.filter((r) => r.isDuplicate).length;

  async function runImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/providers/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => r.mappedRow),
          update_existing: updateExisting,
        }),
      });
      const data = await res.json();
      setImportResults(data);
      setStep("done");
    } finally {
      setImporting(false);
    }
  }

  function startOver() {
    setStep("upload");
    setFileName("");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setParseError(null);
    setImportResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Import Providers</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Upload a CSV of providers, map its columns to our fields, review before committing.
          </p>
        </div>
        <Link href="/providers" className="text-sm text-brand-blue hover:underline">
          ← Back to providers
        </Link>
      </div>

      {step === "upload" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark">
              Choose CSV file
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue-light"
            >
              Download CSV template
            </button>
          </div>
          {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}
          <p className="mt-4 text-xs text-slate-500">
            Any spreadsheet works — you&rsquo;ll map its column headers to our fields on the next
            step, so it doesn&rsquo;t need to match our format exactly.
          </p>
        </div>
      )}

      {step === "map" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-brand-navy">{fileName}</p>
              <button type="button" onClick={startOver} className="text-xs text-brand-blue hover:underline">
                Choose a different file
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              We guessed a mapping for each column below where we could. Adjust any that are wrong,
              and set the rest to the field they represent (or leave as &ldquo;Don&rsquo;t
              import&rdquo;).
            </p>
            {missingRequired.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Still need a column mapped to: {missingRequired.map((f) => f.label).join(", ")}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">CSV column</th>
                  <th className="px-4 py-2 font-medium">Sample value</th>
                  <th className="px-4 py-2 font-medium">Maps to</th>
                </tr>
              </thead>
              <tbody>
                {csvHeaders.map((header) => {
                  const sample = csvRows.find((r) => (r[header] ?? "").trim())?.[header] ?? "";
                  const current = mapping[header] ?? "";
                  return (
                    <tr key={header} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-brand-navy">{header}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate text-slate-500" title={sample}>
                        {sample || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={current}
                          onChange={(e) => setColumnMapping(header, e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        >
                          <option value="">Don&rsquo;t import</option>
                          {PROVIDER_IMPORT_FIELDS.map((f) => {
                            const usedByOther = usedFieldKeys.has(f.key) && current !== f.key;
                            return (
                              <option key={f.key} value={f.key} disabled={usedByOther}>
                                {f.label}
                                {f.required ? " *" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <button
              type="button"
              onClick={goToPreview}
              disabled={missingRequired.length > 0}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40"
            >
              Continue to preview →
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-brand-teal-light px-3 py-1 font-medium text-brand-teal">
                  {validRows.length - duplicateCount} new
                </span>
                {duplicateCount > 0 && (
                  <span className="rounded-full bg-brand-blue-light px-3 py-1 font-medium text-brand-blue">
                    {duplicateCount} already exist
                  </span>
                )}
                {errorRows.length > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
                    {errorRows.length} will be skipped (errors)
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setStep("map")} className="text-xs text-brand-blue hover:underline">
                ← Back to mapping
              </button>
            </div>
            {duplicateCount > 0 && (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                />
                Update existing providers with a matching NPI (otherwise they&rsquo;ll be left
                unchanged and skipped)
              </label>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Row</th>
                  <th className="px-4 py-2 font-medium">NPI</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {validatedRows.map((r) => (
                  <tr key={r.index} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-500">{r.index + 2}</td>
                    <td className="px-4 py-2 text-slate-600">{r.mappedRow.npi || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {[r.mappedRow.first_name, r.mappedRow.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {r.errors.length > 0 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          {r.errors.join("; ")}
                        </span>
                      ) : r.isDuplicate ? (
                        <span className="rounded-full bg-brand-blue-light px-2 py-0.5 text-xs font-medium text-brand-blue">
                          {updateExisting ? "will update" : "already exists — will skip"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-brand-teal-light px-2 py-0.5 text-xs font-medium text-brand-teal">
                          new
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <button
              type="button"
              onClick={runImport}
              disabled={importing || validRows.length === 0}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40"
            >
              {importing ? "Importing…" : `Import ${validRows.length} provider${validRows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {step === "done" && importResults && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-medium text-brand-navy">Import complete</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-brand-teal-light px-3 py-1 font-medium text-brand-teal">
                {importResults.summary.created} created
              </span>
              {importResults.summary.updated > 0 && (
                <span className="rounded-full bg-brand-blue-light px-3 py-1 font-medium text-brand-blue">
                  {importResults.summary.updated} updated
                </span>
              )}
              {importResults.summary.skipped > 0 && (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  {importResults.summary.skipped} skipped
                </span>
              )}
              {importResults.summary.error > 0 && (
                <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
                  {importResults.summary.error} errors
                </span>
              )}
            </div>
            {importResults.results.some((r) => r.status === "error") && (
              <ul className="mt-3 flex flex-col gap-1 text-sm text-red-700">
                {importResults.results
                  .filter((r) => r.status === "error")
                  .map((r) => (
                    <li key={r.row}>
                      Row {r.row + 2} (NPI {r.npi ?? "—"}): {r.message}
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-4 flex gap-3">
              <Link
                href="/providers"
                className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark"
              >
                View providers
              </Link>
              <button
                type="button"
                onClick={startOver}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue-light"
              >
                Import another file
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
