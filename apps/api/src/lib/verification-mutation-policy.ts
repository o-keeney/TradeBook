import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db/drizzle";
import { platformSettings } from "../db/schema";

export const REQUIRE_EMAIL_VERIFIED_FOR_MUTATIONS_KEY =
  "require_email_verified_for_mutations" as const;
export const REQUIRE_SMS_VERIFIED_FOR_MUTATIONS_KEY = "require_sms_verified_for_mutations" as const;

export type VerificationMutationPolicy = {
  requireEmailVerifiedForMutations: boolean;
  requireSmsVerifiedForMutations: boolean;
};

const DEFAULT_POLICY: VerificationMutationPolicy = {
  requireEmailVerifiedForMutations: true,
  /** Default off until SMS vendor is integrated; admins can enable to test the gate. */
  requireSmsVerifiedForMutations: false,
};

function parseBool01(raw: string | null | undefined): boolean | null {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return null;
}

export async function getVerificationMutationPolicy(db: Db): Promise<VerificationMutationPolicy> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(
      inArray(platformSettings.key, [
        REQUIRE_EMAIL_VERIFIED_FOR_MUTATIONS_KEY,
        REQUIRE_SMS_VERIFIED_FOR_MUTATIONS_KEY,
      ]),
    );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const email = parseBool01(map.get(REQUIRE_EMAIL_VERIFIED_FOR_MUTATIONS_KEY));
  const sms = parseBool01(map.get(REQUIRE_SMS_VERIFIED_FOR_MUTATIONS_KEY));
  return {
    requireEmailVerifiedForMutations: email ?? DEFAULT_POLICY.requireEmailVerifiedForMutations,
    requireSmsVerifiedForMutations: sms ?? DEFAULT_POLICY.requireSmsVerifiedForMutations,
  };
}

export async function setVerificationMutationPolicy(
  db: Db,
  patch: Partial<VerificationMutationPolicy>,
): Promise<VerificationMutationPolicy> {
  const now = new Date();
  async function upsert(key: string, value: boolean) {
    const str = value ? "1" : "0";
    const existing = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .get();
    if (existing) {
      await db
        .update(platformSettings)
        .set({ value: str, updatedAt: now })
        .where(eq(platformSettings.key, key));
    } else {
      await db.insert(platformSettings).values({ key, value: str, updatedAt: now });
    }
  }
  if (patch.requireEmailVerifiedForMutations !== undefined) {
    await upsert(REQUIRE_EMAIL_VERIFIED_FOR_MUTATIONS_KEY, patch.requireEmailVerifiedForMutations);
  }
  if (patch.requireSmsVerifiedForMutations !== undefined) {
    await upsert(REQUIRE_SMS_VERIFIED_FOR_MUTATIONS_KEY, patch.requireSmsVerifiedForMutations);
  }
  return getVerificationMutationPolicy(db);
}
