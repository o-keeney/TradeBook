"use client";

import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

export default function FindTradesmenPage() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<unknown>(null);
  const [portfolio, setPortfolio] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProfile(null);
    setPortfolio(null);
    const trimmed = id.trim();
    if (!trimmed) {
      setError("Enter a tradesman user id (UUID).");
      return;
    }
    setLoading(true);
    try {
      const [pRes, poRes] = await Promise.all([
        apiFetch(`/api/tradesmen/${encodeURIComponent(trimmed)}`),
        apiFetch(`/api/tradesmen/${encodeURIComponent(trimmed)}/portfolio`),
      ]);
      if (!pRes.ok) {
        const j = (await pRes.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        setError(j.error?.message ?? `Profile ${pRes.status}`);
        return;
      }
      setProfile(await pRes.json());
      if (poRes.ok) {
        setPortfolio(await poRes.json());
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="Find tradesmen"
      description="Look up a public tradesman profile by user id. Full search (location, trade, filters) is not wired yet."
    >
      <form onSubmit={(e) => void lookup(e)} className="max-w-xl space-y-4">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Tradesman user id (UUID)
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. from a shared link or dashboard"
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {loading ? "Loading…" : "Look up"}
        </button>
      </form>

      {error ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {profile ? (
        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Profile
            </h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-neutral-900 p-4 text-left text-xs text-neutral-100">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </section>
          {portfolio ? (
            <section>
              <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Portfolio
              </h2>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-neutral-900 p-4 text-left text-xs text-neutral-100">
                {JSON.stringify(portfolio, null, 2)}
              </pre>
            </section>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
