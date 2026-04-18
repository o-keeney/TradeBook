"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import {
  publicTradesmanSubtitle,
  TradesmanPublicProfileView,
  type PublicReviewRow,
  type PublicTradesmanProfileCard,
} from "@/components/tradesman-public-profile-view";
import { RequestWorkOrderToTradesman } from "@/components/request-work-order-to-tradesman";
import { apiFetch } from "@/lib/api";

export function TradesmanPublicProfileRoute({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<PublicTradesmanProfileCard | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [portfolioRaw, setPortfolioRaw] = useState<unknown>(undefined);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioFailed, setPortfolioFailed] = useState(false);

  const [reviews, setReviews] = useState<PublicReviewRow[] | null | undefined>(undefined);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsFailed, setReviewsFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPortfolioRaw(undefined);
    setPortfolioLoading(false);
    setPortfolioFailed(false);
    setReviews(undefined);
    setReviewsLoading(false);
    setReviewsFailed(false);
    async function load() {
      setLoadingProfile(true);
      setProfileError(null);
      setProfile(null);
      try {
        const res = await apiFetch(`/api/tradesmen/${encodeURIComponent(userId)}`);
        const data = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
          profile?: PublicTradesmanProfileCard;
        };
        if (!res.ok) {
          if (!cancelled) {
            setProfileError(data.error?.message ?? `Could not load profile (${res.status}).`);
          }
          return;
        }
        if (!cancelled) setProfile(data.profile ?? null);
      } catch {
        if (!cancelled) setProfileError("Could not reach the API. Start it with npm run dev:api from the repo root.");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadPortfolio = useCallback(async () => {
    setPortfolioLoading(true);
    setPortfolioFailed(false);
    setPortfolioRaw(undefined);
    try {
      const res = await apiFetch(`/api/tradesmen/${encodeURIComponent(userId)}/portfolio`);
      if (!res.ok) {
        setPortfolioRaw(null);
        setPortfolioFailed(true);
        return;
      }
      setPortfolioRaw((await res.json()) as unknown);
    } catch {
      setPortfolioRaw(null);
      setPortfolioFailed(true);
    } finally {
      setPortfolioLoading(false);
    }
  }, [userId]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsFailed(false);
    setReviews(undefined);
    try {
      const res = await apiFetch(
        `/api/tradesmen/${encodeURIComponent(userId)}/reviews?limit=8`,
      );
      if (!res.ok) {
        setReviews(null);
        setReviewsFailed(true);
        return;
      }
      const json = (await res.json()) as { reviews?: PublicReviewRow[] };
      setReviews(json.reviews ?? []);
    } catch {
      setReviews(null);
      setReviewsFailed(true);
    } finally {
      setReviewsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    void loadPortfolio();
    if (profile.reviewCount > 0) void loadReviews();
  }, [profile, loadPortfolio, loadReviews]);

  const back = (
    <p className="mb-6">
      <Link
        href="/find-tradesmen"
        className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
      >
        ← Find tradesmen
      </Link>
    </p>
  );

  if (loadingProfile) {
    return (
      <PageShell title="Profile" description="Loading…">
        {back}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading profile…</p>
      </PageShell>
    );
  }

  if (profileError || !profile) {
    return (
      <PageShell title="Profile not found" description={profileError ?? "This tradesperson is not listed."}>
        {back}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {profileError ?? "We could not find a public profile for this link."}
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell title={profile.displayName} description={publicTradesmanSubtitle(profile)} maxWidth="wide">
      {back}
      <TradesmanPublicProfileView
        profile={profile}
        portfolioRaw={portfolioRaw}
        portfolioLoading={portfolioLoading}
        portfolioFailed={portfolioFailed}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        reviewsFailed={reviewsFailed}
      />
      <RequestWorkOrderToTradesman
        tradesmanUserId={profile.id}
        tradesmanDisplayName={profile.displayName}
        suggestedTradeCategories={profile.tradeCategories}
        tradesmanAvailable={profile.isAvailable}
      />
    </PageShell>
  );
}
