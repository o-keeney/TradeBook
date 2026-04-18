import type { MeUser } from "@/components/auth-nav";

/** Mirrors `platform_settings.require_email_verified_for_mutations` (default strict if unset). */
export function meRequiresEmailVerifiedForMutations(me: MeUser): boolean {
  return me.mutationVerification?.requireEmailVerified !== false;
}

/** Mirrors `platform_settings.require_sms_verified_for_mutations`. */
export function meRequiresSmsVerifiedForMutations(me: MeUser): boolean {
  return me.mutationVerification?.requireSmsVerified === true;
}
