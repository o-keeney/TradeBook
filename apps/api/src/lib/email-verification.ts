import { eq } from "drizzle-orm";
import type { createDb } from "../db/drizzle";
import { users } from "../db/schema";
import type { Env } from "../env";
import { resolveAppOrigin } from "./app-origin";
import { sendTransactionalEmail } from "./brevo-email";
import { randomUrlToken, sha256Hex } from "./token-hash";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

function buildVerifyUrl(apiOrigin: string, rawToken: string): string {
  const u = new URL("/api/auth/verify-email", apiOrigin);
  u.searchParams.set("token", rawToken);
  return u.toString();
}

/**
 * Rotates the verification token, persists hash + expiry, and sends the Brevo transactional email.
 * Safe to call for new signups or resend; overwrites any previous pending token.
 */
export async function issueEmailVerificationAndSend(
  env: Env,
  db: ReturnType<typeof createDb>,
  opts: { userId: string; email: string; apiRequestUrl: string },
): Promise<{ emailSent: boolean }> {
  const rawToken = randomUrlToken();
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const sentAt = new Date();

  await db
    .update(users)
    .set({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationLastSentAt: sentAt,
    })
    .where(eq(users.id, opts.userId));

  const apiOrigin = new URL(opts.apiRequestUrl).origin;
  const verifyUrl = buildVerifyUrl(apiOrigin, rawToken);
  const appOrigin = resolveAppOrigin(env);

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p>Hi,</p>
  <p>Confirm your email for TradeBook by using the link below.</p>
  <p><a href="${verifyUrl}">Verify my email</a></p>
  <p>If the link does not work, copy this URL into your browser:</p>
  <p style="word-break:break-all;font-size:12px">${verifyUrl}</p>
  <p>This link expires in 24 hours.</p>
  <p style="font-size:12px;color:#555">You will be redirected to ${appOrigin} after confirming.</p>
</body></html>`;

  const result = await sendTransactionalEmail(env, {
    to: opts.email,
    subject: "Verify your TradeBook email",
    html,
  });

  if (!result.ok && env.ENVIRONMENT !== "production") {
    console.warn("[email] Verification link (dev, email not sent):", verifyUrl);
  }

  return { emailSent: result.ok };
}

export function canResendVerification(
  lastSent: Date | null | undefined,
): { ok: true } | { ok: false; retryAfterMs: number } {
  if (!lastSent) return { ok: true };
  const elapsed = Date.now() - lastSent.getTime();
  if (elapsed >= EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) return { ok: true };
  return { ok: false, retryAfterMs: EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - elapsed };
}
