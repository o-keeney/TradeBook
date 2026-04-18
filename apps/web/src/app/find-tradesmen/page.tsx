"use client";

import { useCallback, useEffect, useState } from "react";
import { MapboxAddressField } from "@/components/mapbox-address-field";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type PublicTradesmanProfile = {
  id: string;
  displayName: string;
  companyName: string | null;
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

function formatRatingLine(avg: number | null, reviewCount: number): string {
  if (reviewCount <= 0) return "No reviews yet";
  const n = reviewCount === 1 ? "1 review" : `${reviewCount} reviews`;
  const a = avg == null ? NaN : Number(avg);
  if (Number.isNaN(a)) return n;
  return `${a.toFixed(1)} average · ${n}`;
}

export default function FindTradesmenPage() {
  const [profession, setProfession] = useState("");
  const [address, setAddress] = useState("");
  const [county, setCounty] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [minRating, setMinRating] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultRow[] | null>(null);
  /** `null` until the first list load finishes; then reflects the last successful fetch. */
  const [listSource, setListSource] = useState<"top" | "search" | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** `undefined` = not loaded, `null` = error or empty, object = payload */
  const [portfolioById, setPortfolioById] = useState<Record<string, unknown | null>>({});
  const [loadingPortfolioId, setLoadingPortfolioId] = useState<string | null>(null);

  const runSearch = useCallback(
    async (
      opts: {
        profession?: string;
        address?: string;
        county?: string;
        availableOnly?: boolean;
        minRating?: string;
      } = {},
    ) => {
      setError(null);
      setPortfolioById({});
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const p = opts.profession?.trim();
        const a = opts.address?.trim();
        const c = opts.county?.trim();
        if (p) params.set("profession", p);
        if (a) params.set("address", a);
        if (c) params.set("county", c);
        if (opts.availableOnly) params.set("available", "1");
        const mr = opts.minRating?.trim();
        if (mr) {
          const n = Number.parseFloat(mr.replace(",", "."));
          if (Number.isFinite(n) && n >= 0 && n <= 5) params.set("minRating", String(n));
        }
        const isFiltered = [...params.keys()].length > 0;
        const qs = params.toString();
        const res = await apiFetch(`/api/tradesmen${qs ? `?${qs}` : ""}`);
        const data = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
          results?: SearchResultRow[];
        };
        if (!res.ok) {
          setError(data.error?.message ?? `Search failed (${res.status})`);
          return;
        }
        setResults(data.results ?? []);
        setListSource(isFiltered ? "search" : "top");
      } catch {
        setError("Could not reach the API. Start it with npm run dev:api from the repo root.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void runSearch({});
  }, [runSearch]);

  function search(e: React.FormEvent) {
    e.preventDefault();
    void runSearch({ profession, address, county, availableOnly, minRating });
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
      description="We show the highest-rated tradespeople first (by average review score). Narrow results with trade, area, or county."
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
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950"
          />
          Only show tradespeople marked as available
        </label>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Minimum average rating (optional, 0–5)
          <input
            type="text"
            inputMode="decimal"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            placeholder="e.g. 4"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {loading && results === null ? (
        <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">Loading tradespeople…</p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {results !== null ? (
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {listSource === "top"
              ? results.length === 0
                ? "Top-rated tradespeople"
                : `Top-rated tradespeople (${results.length})`
              : results.length === 0
                ? "No matches"
                : `Search results (${results.length})`}
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {listSource === "top"
                ? "No tradespeople are listed yet."
                : "Try different keywords, or ask tradespeople to fill in trade and service area on their profile."}
            </p>
          ) : (
            <ul className="space-y-4">
              {results.map(({ profile }) => (
                <li
                  key={profile.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {profile.displayName}
                    </h3>
                    {profile.companyName ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {profile.companyName}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                  <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {formatRatingLine(profile.avgRating, profile.reviewCount)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
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
