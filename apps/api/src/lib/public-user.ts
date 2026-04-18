import { users } from "../db/schema";

export type UserRow = typeof users.$inferSelect;

export function toPublicUser(user: UserRow) {
  const {
    passwordHash: _p,
    emailVerificationTokenHash: _h,
    emailVerificationExpiresAt: _e,
    emailVerificationLastSentAt: _l,
    passwordResetTokenHash: _prh,
    passwordResetExpiresAt: _pre,
    ...rest
  } = user;
  return rest;
}
