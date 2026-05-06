"use client";

import Script from "next/script";
import { useEffect, useMemo } from "react";
import {
  TRADEBOOK_CONSENT_CHANGED_EVENT,
  hasAnalyticsConsent,
  hasMarketingConsent,
} from "@/lib/cookie-consent-storage";
import { getGoogleAdsTagId, gtagTyped } from "@/lib/google-ads";

export function GoogleAdsBootstrap() {
  const tagId = useMemo(() => getGoogleAdsTagId(), []);

  useEffect(() => {
    if (!tagId) return;

    gtagTyped("js", new Date());
    gtagTyped("config", tagId);

    // Default deny until the user explicitly sets consent choices.
    gtagTyped("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });

    const syncConsent = () => {
      const marketing = hasMarketingConsent();
      const analytics = hasAnalyticsConsent();
      gtagTyped("consent", "update", {
        ad_storage: marketing ? "granted" : "denied",
        ad_user_data: marketing ? "granted" : "denied",
        ad_personalization: marketing ? "granted" : "denied",
        analytics_storage: analytics ? "granted" : "denied",
      });
    };

    syncConsent();
    window.addEventListener(TRADEBOOK_CONSENT_CHANGED_EVENT, syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener(TRADEBOOK_CONSENT_CHANGED_EVENT, syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, [tagId]);

  if (!tagId) return null;

  return (
    <Script
      id="tradebook-google-ads-gtag"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`}
      strategy="afterInteractive"
    />
  );
}
