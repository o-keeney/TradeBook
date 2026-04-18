export const COOKIE_CONSENT_STORAGE_KEY = "tradebook_consent_v1";

export const TRADEBOOK_CONSENT_CHANGED_EVENT = "tradebook-consent-changed";

export type CookieConsentV1 = {
  v: 1;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

export function readCookieConsent(): CookieConsentV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentV1;
    if (parsed?.v !== 1 || parsed.necessary !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasMarketingConsent(): boolean {
  return readCookieConsent()?.marketing === true;
}

export function writeCookieConsent(analytics: boolean, marketing: boolean): void {
  const payload: CookieConsentV1 = {
    v: 1,
    necessary: true,
    analytics,
    marketing,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TRADEBOOK_CONSENT_CHANGED_EVENT));
  }
}
