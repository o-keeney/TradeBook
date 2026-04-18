import type { tradesmenProfiles } from "../db/schema";
import type { UserRow } from "./public-user";

export type TradesmanProfileRow = typeof tradesmenProfiles.$inferSelect;

function tradesmanDisplayName(
  user: Pick<UserRow, "firstName" | "lastName">,
  companyName: string | null | undefined,
): string {
  const f = user.firstName?.trim() ?? "";
  const l = user.lastName?.trim() ?? "";
  const full = `${f} ${l}`.trim();
  if (full.length > 0) return full;
  const co = companyName?.trim() ?? "";
  if (co.length > 0) return co;
  return "Tradesperson";
}

/** Public discovery / profile card (no account email; optional contact_* when visibility flags allow). */
export function toPublicTradesmanProfile(
  user: Pick<UserRow, "id" | "role" | "firstName" | "lastName">,
  profile: TradesmanProfileRow,
) {
  const contact: { email?: string; phone?: string } = {};
  if (profile.contactEmailVisible && profile.contactEmail) {
    contact.email = profile.contactEmail;
  }
  if (profile.contactPhoneVisible && profile.contactPhone) {
    contact.phone = profile.contactPhone;
  }

  const company = profile.companyName?.trim();
  return {
    id: user.id,
    displayName: tradesmanDisplayName(user, profile.companyName),
    companyName: company && company.length > 0 ? company : null,
    bio: profile.bio,
    tradeCategories: profile.tradeCategories,
    region: profile.regionConfig,
    isAvailable: profile.isAvailable,
    verificationStatus: profile.verificationStatus,
    avgRating: profile.avgRating,
    reviewCount: profile.reviewCount,
    subscriptionTier: profile.subscriptionTier,
    contact: Object.keys(contact).length ? contact : undefined,
  };
}

/** Owner editing / dashboard: includes visibility flags and subscription fields. */
export function toOwnerTradesmanProfile(profile: TradesmanProfileRow) {
  return { ...profile };
}
