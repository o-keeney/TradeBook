import type { tradesmenProfiles } from "../db/schema";
import type { UserRow } from "./public-user";

export type TradesmanProfileRow = typeof tradesmenProfiles.$inferSelect;

/** Public discovery / profile card (no account email; optional contact_* when visibility flags allow). */
export function toPublicTradesmanProfile(
  user: Pick<UserRow, "id" | "role">,
  profile: TradesmanProfileRow,
) {
  const contact: { email?: string; phone?: string } = {};
  if (profile.contactEmailVisible && profile.contactEmail) {
    contact.email = profile.contactEmail;
  }
  if (profile.contactPhoneVisible && profile.contactPhone) {
    contact.phone = profile.contactPhone;
  }

  return {
    id: user.id,
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
