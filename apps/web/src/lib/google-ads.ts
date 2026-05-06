"use client";

type GtagCommand = "js" | "config" | "consent" | "event";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Google Ads tag id in format AW-XXXXXXXXX. */
export function getGoogleAdsTagId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_ADS_TAG_ID?.trim();
  if (!raw || !/^AW-\d+$/i.test(raw)) return null;
  return raw.toUpperCase();
}

/**
 * Optional send_to target in format `AW-123456789/AbCdEfGhIjKlMnOp`.
 * Provide this env var per conversion action you want to track.
 */
export function getGoogleAdsSendTo(envName: string): string | null {
  const raw = process.env[envName]?.trim();
  if (!raw || !/^AW-\d+\/[\w-]+$/i.test(raw)) return null;
  return raw;
}

export function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const dl = window.dataLayer as unknown[];
  dl.push(args);
  if (typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

export function gtagTyped(command: GtagCommand, ...rest: unknown[]): void {
  gtag(command, ...rest);
}

export function trackGoogleAdsConversion(params: {
  sendTo: string;
  value?: number;
  currency?: string;
  transactionId?: string;
}): void {
  gtagTyped("event", "conversion", {
    send_to: params.sendTo,
    value: params.value,
    currency: params.currency ?? "EUR",
    transaction_id: params.transactionId,
  });
}
