"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readCookieConsent, writeCookieConsent } from "@/lib/cookie-consent-storage";

/**
 * Stores preferences in `localStorage` for analytics/marketing (e.g. {@link AdSlot} reads marketing).
 * Essential session cookies are always required to use signed-in features.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readCookieConsent() != null) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
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
            We use essential cookies to keep you signed in and run the service. If you accept all, we may load
            optional analytics and <strong>personalised advertising</strong> where configured (for example Google
            AdSense). See our{" "}
            <Link
              href="/privacy"
              className="font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="min-h-11 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-800 touch-manipulation transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-900"
            onClick={() => {
              writeCookieConsent(false, false);
              setVisible(false);
            }}
          >
            Necessary only
          </button>
          <button
            type="button"
            className="tb-btn-primary min-h-11 px-4 py-2.5 touch-manipulation"
            onClick={() => {
              writeCookieConsent(true, true);
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
