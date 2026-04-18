"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
  profilePhotoUrl?: string | null;
  contact?: { email?: string; phone?: string };
};

type AvatarProfile = Pick<PublicTradesmanProfileCard, "displayName" | "profilePhotoUrl">;

const avatarSizePx = { sm: 48, md: 72, lg: 96 } as const;

/** Neutral silhouette when no photo or when the image URL fails to load. */
function TradesmanAvatarPlaceholder({
  displayName,
  sizePx,
}: {
  displayName: string;
  sizePx: number;
}) {
  const icon = Math.max(18, Math.round(sizePx * 0.44));
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-neutral-100 to-neutral-200 text-neutral-500 ring-2 ring-neutral-200 dark:from-neutral-800 dark:to-neutral-900 dark:text-neutral-400 dark:ring-neutral-700"
      style={{ width: sizePx, height: sizePx }}
      role="img"
      aria-label={displayName.trim() ? `${displayName} — default profile image` : "Default profile image"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.35}
        stroke="currentColor"
        className="opacity-80"
        width={icon}
        height={icon}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0115 0"
        />
      </svg>
    </div>
  );
}

/** Rounded photo, or default placeholder; used on listings and public profile. */
export function TradesmanProfileAvatar({
  profile,
  size = "md",
}: {
  profile: AvatarProfile;
  size?: keyof typeof avatarSizePx;
}) {
  const px = avatarSizePx[size];
  const url = profile.profilePhotoUrl?.trim() ?? "";
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [url]);

  if (!url || photoFailed) {
    return <TradesmanAvatarPlaceholder displayName={profile.displayName} sizePx={px} />;
  }

  return (
    <Image
      src={url}
      alt=""
      width={px}
      height={px}
      className="shrink-0 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700"
      style={{ width: px, height: px }}
      unoptimized
      onError={() => setPhotoFailed(true)}
    />
  );
}

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

function portfolioCondensedMeta(proj: PortfolioProjectPublic): string {
  const parts: string[] = [];
  if (proj.projectDate?.trim()) parts.push(proj.projectDate.trim());
  const n = proj.images.length;
  parts.push(n === 0 ? "No photos" : n === 1 ? "1 photo" : `${n} photos`);
  return parts.join(" · ");
}

function PortfolioChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform dark:text-neutral-400 ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.084l3.71-3.85a.75.75 0 111.08 1.04l-4.25 4.4a.75.75 0 01-1.08 0l-4.25-4.4a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Full project body (metadata, description, gallery) — shown when a row is expanded. */
function PublicPortfolioProjectDetail({
  proj,
  panelId,
}: {
  proj: PortfolioProjectPublic;
  panelId: string;
}) {
  return (
    <div
      id={panelId}
      role="region"
      aria-labelledby={`portfolio-trigger-${proj.id}`}
      className="border-t border-neutral-200 px-3 pb-4 pt-3 dark:border-neutral-700 sm:px-4"
    >
      {proj.projectDate || proj.durationText?.trim() || proj.budgetText?.trim() ? (
        <dl className="space-y-1.5 text-xs">
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
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {proj.description}
        </p>
      ) : null}
      {proj.images.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
    </div>
  );
}

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
  const [expandedPortfolioId, setExpandedPortfolioId] = useState<string | null>(null);
  const portfolioKey = portfolio?.projects.map((p) => p.id).join("|") ?? "";

  useEffect(() => {
    setExpandedPortfolioId(null);
  }, [profile.id, portfolioKey]);

  return (
    <div className="space-y-0 text-neutral-900 dark:text-neutral-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <TradesmanProfileAvatar profile={profile} size="lg" />
        <div className="min-w-0 flex-1 space-y-3">
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

      <p className="text-sm font-medium">{formatRatingLine(profile.avgRating, profile.reviewCount)}</p>
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
        <section className="mt-2 sm:mt-3">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {profile.bio}
          </p>
        </section>
      ) : null}
        </div>
      </div>

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
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Tap a project to view photos and full details.
        </p>
        {portfolioLoading ? <p className="mt-2 text-sm text-neutral-500">Loading portfolio…</p> : null}
        {portfolioFailed ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">Could not load portfolio.</p> : null}
        {portfolio && portfolio.projects.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No public projects yet.</p>
        ) : null}
        {portfolio && portfolio.projects.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {portfolio.projects.map((proj: PortfolioProjectPublic) => {
              const open = expandedPortfolioId === proj.id;
              const thumb = proj.images[0];
              return (
                <li
                  key={proj.id}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900/40"
                >
                  <button
                    type="button"
                    id={`portfolio-trigger-${proj.id}`}
                    aria-expanded={open}
                    aria-controls={`portfolio-panel-${proj.id}`}
                    onClick={() => setExpandedPortfolioId(open ? null : proj.id)}
                    className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition hover:bg-neutral-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:bg-neutral-800/60 dark:focus-visible:ring-neutral-500 sm:gap-4 sm:p-3.5"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 sm:h-16 sm:w-16">
                      {thumb ? (
                        <Image
                          src={thumb.url}
                          alt=""
                          width={128}
                          height={128}
                          className="h-full w-full object-cover"
                          sizes="64px"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                          No photo
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{proj.title}</h3>
                      <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                        {portfolioCondensedMeta(proj)}
                      </p>
                    </div>
                    <PortfolioChevron open={open} />
                  </button>
                  {open ? (
                    <PublicPortfolioProjectDetail proj={proj} panelId={`portfolio-panel-${proj.id}`} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
