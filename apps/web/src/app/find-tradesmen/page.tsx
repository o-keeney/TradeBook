"use client";

import { useState } from "react";
import { MapboxAddressField } from "@/components/mapbox-address-field";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type PublicTradesmanProfile = {
  id: string;
  bio: string;
  tradeCategories: string[];
  region: Record<string, unknown>;
  isAvailable: boolean;
  verificationStatus: string;
  avgRating: number | null;
  reviewCount: number;
  subscriptionTier: string | null;
  contact?: { email?: string; phone?: string };
};

type SearchResultRow = { profile: PublicTradesmanProfile };

const PROFESSION_HINTS = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Roofer",
  "Heating engineer",
  "Tiler",
  "Landscaper",
  "Locksmith",
  "General builder",
] as const;

const IRISH_COUNTIES = [
  "Carlow",
  "Cavan",
  "Clare",
  "Cork",
  "Donegal",
  "Dublin",
  "Galway",
  "Kerry",
  "Kildare",
  "Kilkenny",
  "Laois",
  "Leitrim",
  "Limerick",
  "Longford",
  "Louth",
  "Mayo",
  "Meath",
  "Monaghan",
  "Offaly",
  "Roscommon",
  "Sligo",
  "Tipperary",
  "Waterford",
  "Westmeath",
  "Wexford",
  "Wicklow",
] as const;

export default function FindTradesmenPage() {
  const [profession, setProfession] = useState("");
  const [address, setAddress] = useState("");
  const [county, setCounty] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** `undefined` = not loaded, `null` = error or empty, object = payload */
  const [portfolioById, setPortfolioById] = useState<Record<string, unknown | null>>({});
  const [loadingPortfolioId, setLoadingPortfolioId] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setPortfolioById({});
    if (!profession.trim() && !address.trim() && !county.trim()) {
      setError("Enter at least one of profession, address, or county.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (profession.trim()) params.set("profession", profession.trim());
      if (address.trim()) params.set("address", address.trim());
      if (county.trim()) params.set("county", county.trim());
      const res = await apiFetch(`/api/tradesmen/search?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        results?: SearchResultRow[];
      };
      if (!res.ok) {
        setError(data.error?.message ?? `Search failed (${res.status})`);
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError("Could not reach the API. Start it with npm run dev:api from the repo root.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPortfolio(userId: string) {
    const existing = portfolioById[userId];
    if (existing !== undefined && existing !== null) return;
    if (loadingPortfolioId === userId) return;
    setLoadingPortfolioId(userId);
    setError(null);
    try {
      const res = await apiFetch(`/api/tradesmen/${encodeURIComponent(userId)}/portfolio`);
      if (!res.ok) {
        setPortfolioById((m) => ({ ...m, [userId]: null }));
        return;
      }
      const json = (await res.json()) as unknown;
      setPortfolioById((m) => ({ ...m, [userId]: json }));
    } catch {
      setPortfolioById((m) => ({ ...m, [userId]: null }));
    } finally {
      setLoadingPortfolioId(null);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

  return (
    <PageShell
      title="Find tradesmen"
      description="Search by trade, area, or county. Results match the details tradespeople add to their profiles."
    >
      <form onSubmit={(e) => void search(e)} className="max-w-xl space-y-4">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Profession / trade
          <input
            name="profession"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            placeholder="e.g. Electrician, plumber"
            list="profession-hints"
            className={inputClass}
          />
          <datalist id="profession-hints">
            {PROFESSION_HINTS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <div className="block space-y-1">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Address or area
          </span>
          <MapboxAddressField
            value={address}
            onChange={(line) => setAddress(line)}
            placeholder="Town, street, or neighbourhood"
            inputClassName={inputClass}
          />
        </div>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          County
          <input
            name="county"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="e.g. Dublin, Cork"
            list="irish-counties"
            className={inputClass}
          />
          <datalist id="irish-counties">
            {IRISH_COUNTIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {results !== null ? (
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {results.length === 0 ? "No matches" : `${results.length} result${results.length === 1 ? "" : "s"}`}
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Try different keywords, or ask tradespeople to fill in trade and service area on their
              profile.
            </p>
          ) : (
            <ul className="space-y-4">
              {results.map(({ profile }) => (
                <li
                  key={profile.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex flex-wrap gap-2">
                    {profile.tradeCategories.length ? (
                      profile.tradeCategories.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-500">No trades listed yet</span>
                    )}
                  </div>
                  {profile.bio ? (
                    <p className="mt-2 line-clamp-4 text-sm text-neutral-700 dark:text-neutral-300">
                      {profile.bio}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-neutral-500">
                    {profile.isAvailable ? "Available" : "Unavailable"} ·{" "}
                    {profile.verificationStatus === "verified"
                      ? "Verified"
                      : "Verification: " + profile.verificationStatus}
                  </p>
                  {portfolioById[profile.id] === undefined || portfolioById[profile.id] === null ? (
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-neutral-900 underline dark:text-neutral-100"
                      onClick={() => void loadPortfolio(profile.id)}
                      disabled={loadingPortfolioId === profile.id}
                    >
                      {loadingPortfolioId === profile.id
                        ? "Loading portfolio…"
                        : portfolioById[profile.id] === null
                          ? "Retry portfolio"
                          : "Show portfolio"}
                    </button>
                  ) : null}
                  {portfolioById[profile.id] !== undefined && portfolioById[profile.id] !== null ? (
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-neutral-900 p-3 text-left text-xs text-neutral-100">
                      {JSON.stringify(portfolioById[profile.id], null, 2)}
                    </pre>
                  ) : portfolioById[profile.id] === null && loadingPortfolioId !== profile.id ? (
                    <p className="mt-2 text-xs text-neutral-500">Could not load portfolio.</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
