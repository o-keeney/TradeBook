"use client";

import Image from "next/image";
import { useMemo } from "react";
import { formatBudgetDisplay } from "@/lib/format-budget";

export type PublicTradesmanProfileCard = {
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

export type PublicReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: number;
  reviewerFirstName: string | null;
};

type PortfolioImage = { id: string; url: string; caption: string | null };
export type PortfolioProjectPublic = {
  id: string;
  title: string;
  description: string;
  projectDate: string | null;
  durationText: string | null;
  budgetText: string | null;
  images: PortfolioImage[];
};

function parsePortfolioPayload(raw: unknown): { projects: PortfolioProjectPublic[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { projects?: unknown };
  if (!Array.isArray(o.projects)) return null;
  const projects: PortfolioProjectPublic[] = [];
  for (const p of o.projects) {
    if (!p || typeof p !== "object") continue;
    const row = p as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const title = typeof row.title === "string" ? row.title : "";
    if (!id || !title) continue;
    const imagesRaw = row.images;
    const images: PortfolioImage[] = [];
    if (Array.isArray(imagesRaw)) {
      for (const im of imagesRaw) {
        if (!im || typeof im !== "object") continue;
        const img = im as Record<string, unknown>;
        const iid = typeof img.id === "string" ? img.id : "";
        const url = typeof img.url === "string" ? img.url : "";
        if (!iid || !url) continue;
        images.push({
          id: iid,
          url,
          caption: typeof img.caption === "string" ? img.caption : null,
        });
      }
    }
    projects.push({
      id,
      title,
      description: typeof row.description === "string" ? row.description : "",
      projectDate: typeof row.projectDate === "string" ? row.projectDate : null,
      durationText: typeof row.durationText === "string" ? row.durationText : null,
      budgetText: typeof row.budgetText === "string" ? row.budgetText : null,
      images,
    });
  }
  return { projects };
}

function formatRatingLine(avg: number | null, reviewCount: number): string {
  if (reviewCount <= 0) return "No reviews yet";
  const n = reviewCount === 1 ? "1 review" : `${reviewCount} reviews`;
  const a = avg == null ? NaN : Number(avg);
  if (Number.isNaN(a)) return n;
  return `${a.toFixed(1)} average · ${n}`;
}

function formatReviewWhen(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StarRating({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span aria-label={`${r} out of 5 stars`}>
      <span className="text-amber-500">{"★".repeat(r)}</span>
      <span className="text-neutral-300 dark:text-neutral-600">{"★".repeat(5 - r)}</span>
    </span>
  );
}

function regionSummary(region: Record<string, unknown>): string | null {
  const addr = region.serviceAddress;
  if (typeof addr === "string" && addr.trim()) return addr.trim();
  return null;
}

/** One line for page metadata / shell description: company, else service area. */
export function publicTradesmanSubtitle(profile: PublicTradesmanProfileCard): string | undefined {
  const co = profile.companyName?.trim();
  if (co) return co;
  return regionSummary(profile.region) ?? undefined;
}

export type TradesmanPublicProfileViewProps = {
  profile: PublicTradesmanProfileCard;
  portfolioRaw: unknown;
  portfolioLoading: boolean;
  portfolioFailed: boolean;
  reviews: PublicReviewRow[] | null | undefined;
  reviewsLoading: boolean;
  reviewsFailed: boolean;
};

/** Public tradesperson profile body (trades, bio, reviews, portfolio). Use inside a page shell that already shows the name as the page title. */
export function TradesmanPublicProfileView({
  profile,
  portfolioRaw,
  portfolioLoading,
  portfolioFailed,
  reviews,
  reviewsLoading,
  reviewsFailed,
}: TradesmanPublicProfileViewProps) {
  const portfolio = useMemo(() => parsePortfolioPayload(portfolioRaw), [portfolioRaw]);

  return (
    <div className="space-y-0 text-neutral-900 dark:text-neutral-100">
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

      <p className="mt-3 text-sm font-medium">{formatRatingLine(profile.avgRating, profile.reviewCount)}</p>
      <p className="mt-1 text-xs text-neutral-500">
        {profile.isAvailable ? "Available" : "Unavailable"} ·{" "}
        {profile.verificationStatus === "verified"
          ? "Verified"
          : "Verification: " + profile.verificationStatus}
      </p>

      {regionSummary(profile.region) ? (
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">Service area: </span>
          {regionSummary(profile.region)}
        </p>
      ) : null}

      {profile.contact?.email || profile.contact?.phone ? (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contact</p>
          {profile.contact.email ? (
            <p className="mt-1">
              <a className="text-indigo-600 underline dark:text-indigo-400" href={`mailto:${profile.contact.email}`}>
                {profile.contact.email}
              </a>
            </p>
          ) : null}
          {profile.contact.phone ? (
            <p className="mt-1">
              <a className="text-indigo-600 underline dark:text-indigo-400" href={`tel:${profile.contact.phone}`}>
                {profile.contact.phone}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {profile.bio ? (
        <section className="mt-5">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {profile.bio}
          </p>
        </section>
      ) : null}

      {profile.reviewCount > 0 ? (
        <section className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Recent reviews</h2>
          {reviewsLoading ? <p className="mt-2 text-sm text-neutral-500">Loading reviews…</p> : null}
          {reviewsFailed ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">Could not load reviews.</p> : null}
          {Array.isArray(reviews) && reviews.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No review text to show.</p>
          ) : null}
          {Array.isArray(reviews) && reviews.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <StarRating rating={r.rating} />
                    <span className="font-medium">
                      {r.reviewerFirstName?.trim() ? r.reviewerFirstName.trim() : "Customer"}
                    </span>
                    <time className="text-xs text-neutral-500" dateTime={new Date(r.createdAt).toISOString()}>
                      {formatReviewWhen(r.createdAt)}
                    </time>
                  </div>
                  {r.comment?.trim() ? (
                    <p className="mt-1 text-neutral-700 dark:text-neutral-300">&ldquo;{r.comment.trim()}&rdquo;</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Portfolio</h2>
        {portfolioLoading ? <p className="mt-2 text-sm text-neutral-500">Loading portfolio…</p> : null}
        {portfolioFailed ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">Could not load portfolio.</p> : null}
        {portfolio && portfolio.projects.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No public projects yet.</p>
        ) : null}
        {portfolio && portfolio.projects.length > 0 ? (
          <ul className="mt-4 space-y-8">
            {portfolio.projects.map((proj: PortfolioProjectPublic) => (
              <li
                key={proj.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40"
              >
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{proj.title}</h3>
                {proj.projectDate || proj.durationText?.trim() || proj.budgetText?.trim() ? (
                  <dl className="mt-2 space-y-1.5 text-xs">
                    {proj.projectDate ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <dt className="shrink-0 font-medium text-neutral-700 dark:text-neutral-300">Date</dt>
                        <dd className="min-w-0 text-neutral-600 dark:text-neutral-400">{proj.projectDate}</dd>
                      </div>
                    ) : null}
                    {proj.durationText?.trim() ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <dt className="shrink-0 font-medium text-neutral-700 dark:text-neutral-300">Duration</dt>
                        <dd className="min-w-0 text-neutral-600 dark:text-neutral-400">{proj.durationText.trim()}</dd>
                      </div>
                    ) : null}
                    {proj.budgetText?.trim() ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <dt className="shrink-0 font-medium text-neutral-700 dark:text-neutral-300">Budget</dt>
                        <dd className="min-w-0 text-neutral-600 dark:text-neutral-400">
                          {formatBudgetDisplay(proj.budgetText)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
                {proj.description?.trim() ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                    {proj.description}
                  </p>
                ) : null}
                {proj.images.length > 0 ? (
                  <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {proj.images.map((img) => (
                        <li
                        key={img.id}
                        className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950"
                      >
                        <Image
                          src={img.url}
                          alt={img.caption?.trim() ? img.caption : `${proj.title} — portfolio photo`}
                          width={800}
                          height={800}
                          sizes="(max-width: 640px) 50vw, 280px"
                          className="aspect-square w-full object-cover"
                          loading="lazy"
                        />
                        {img.caption?.trim() ? (
                          <p className="border-t border-neutral-100 px-2 py-1 text-[11px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                            {img.caption.trim()}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
