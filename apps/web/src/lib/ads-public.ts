/** Full client id, e.g. `ca-pub-1234567890123456` (AdSense → Sites → code snippet). */
export function getAdSensePublisherId(): string | null {
  const v = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER?.trim();
  if (!v || !/^ca-pub-\d+$/i.test(v)) return null;
  return v;
}

/** Numeric display slot id from AdSense ad units. */
export function getAdSenseSlotId(placement: "home_under_hero" | "find_tradesmen_inline"): string | null {
  const raw =
    placement === "home_under_hero"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME?.trim()
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_FIND?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  return raw;
}
