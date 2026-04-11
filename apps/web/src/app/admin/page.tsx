"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

export default function AdminPage() {
  const [euros, setEuros] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/pricing");
      if (res.status === 403) {
        setError("You need to be signed in as an admin to view this page.");
        return;
      }
      if (!res.ok) {
        setError("Could not load pricing.");
        return;
      }
      const data = (await res.json()) as { tradesmanMonthlyEuros?: number };
      const n = data.tradesmanMonthlyEuros;
      setEuros(typeof n === "number" && Number.isFinite(n) ? String(n) : "30");
    } catch {
      setError("Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsed = Number.parseFloat(euros.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid price (0 or greater).");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/pricing", {
        method: "PATCH",
        body: JSON.stringify({ tradesmanMonthlyEuros: parsed }),
      });
      if (res.status === 403) {
        setError("Admin access required.");
        return;
      }
      if (!res.ok) {
        setError("Could not save.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Admin · Pricing"
      description="Tradesman subscription price shown on the home page (per month, EUR)."
    >
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <form onSubmit={(e) => void onSave(e)} className="max-w-md space-y-4">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Tradesman monthly price (EUR)
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={euros}
              onChange={(ev) => setEuros(ev.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </PageShell>
  );
}
