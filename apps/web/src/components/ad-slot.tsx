"use client";

import { useEffect, useRef, useState } from "react";
import { getAdSensePublisherId, getAdSenseSlotId } from "@/lib/ads-public";
import {
  TRADEBOOK_CONSENT_CHANGED_EVENT,
  hasMarketingConsent,
} from "@/lib/cookie-consent-storage";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const ADS_SCRIPT_ID = "tradebook-adsbygoogle-js";

let adsenseScriptPromise: Promise<void> | null = null;

function loadAdsenseScript(clientId: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const existing = document.getElementById(ADS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.client === clientId) {
    return Promise.resolve();
  }

  if (adsenseScriptPromise) return adsenseScriptPromise;

  adsenseScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = ADS_SCRIPT_ID;
    s.async = true;
    s.dataset.client = clientId;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => {
      adsenseScriptPromise = null;
      reject(new Error("AdSense script failed to load"));
    };
    document.head.appendChild(s);
  });
  return adsenseScriptPromise;
}

export type AdPlacement = "home_under_hero" | "find_tradesmen_inline";

type AdSlotProps = {
  placement: AdPlacement;
  className?: string;
};

/**
 * Responsive AdSense unit: loads only after **marketing** cookie consent, when the slot
 * nears the viewport, and when `NEXT_PUBLIC_ADSENSE_*` env vars are set. Never blocks layout
 * or primary CTAs.
 */
export function AdSlot({ placement, className }: AdSlotProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const [inView, setInView] = useState(false);
  const [consentOk, setConsentOk] = useState(false);
  const pushedRef = useRef(false);

  const publisher = getAdSensePublisherId();
  const slotId = getAdSenseSlotId(placement);

  useEffect(() => {
    const sync = () => setConsentOk(hasMarketingConsent());
    sync();
    const onChange = () => sync();
    window.addEventListener(TRADEBOOK_CONSENT_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(TRADEBOOK_CONSENT_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !consentOk || !publisher || !slotId) return;
    const ins = insRef.current;
    if (!ins || pushedRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        await loadAdsenseScript(publisher);
        if (cancelled || !insRef.current || pushedRef.current) return;
        pushedRef.current = true;
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        pushedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inView, consentOk, publisher, slotId]);

  if (!publisher || !slotId || !consentOk) return null;

  return (
    <aside
      ref={wrapRef}
      className={className}
      aria-label="Advertisement"
      data-ad-placement={placement}
    >
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 dark:border-neutral-600 dark:bg-neutral-900/40">
        <p className="border-b border-neutral-200 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          Sponsored
        </p>
        <ins
          ref={insRef}
          className="adsbygoogle block min-h-[100px] w-full"
          style={{ display: "block" }}
          data-ad-client={publisher}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
