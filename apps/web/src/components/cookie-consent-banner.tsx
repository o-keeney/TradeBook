"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "tradebook_consent_v1";

type ConsentV1 = {
  v: 1;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

function readStored(): ConsentV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentV1;
    if (parsed?.v !== 1 || parsed.necessary !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean, marketing: boolean) {
  const payload: ConsentV1 = {
    v: 1,
    necessary: true,
    analytics,
    marketing,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Stores preferences in `localStorage` for future analytics/marketing wiring.
 * Essential session cookies are always required to use signed-in features.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readStored() != null) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[var(--border)] bg-[var(--surface)]/95 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 text-sm text-[var(--muted-foreground)]">
          <p id="cookie-consent-title" className="font-semibold text-[var(--foreground)]">
            Cookies and similar technologies
          </p>
          <p id="cookie-consent-desc" className="mt-1 text-pretty">
            We use essential cookies to keep you signed in and run the service. Optional categories can be enabled
            if we add analytics or marketing tools later. See our{" "}
            <Link href="/privacy" className="font-medium text-[var(--primary)] underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-900"
            onClick={() => {
              writeConsent(false, false);
              setVisible(false);
            }}
          >
            Necessary only
          </button>
          <button
            type="button"
            className="tb-btn-primary"
            onClick={() => {
              writeConsent(true, true);
              setVisible(false);
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
