import { eq } from "drizzle-orm";
import type { createDb } from "../db/drizzle";
import { users } from "../db/schema";
import type { Env } from "../env";
import { resolveAppOrigin } from "./app-origin";
import { sendTransactionalEmail } from "./brevo-email";
import { randomUrlToken, sha256Hex } from "./token-hash";

const RESET_TTL_MS = 60 * 60 * 1000;

function buildResetUrl(appOrigin: string, rawToken: string): string {
  const u = new URL("/reset-password", appOrigin);
  u.searchParams.set("token", rawToken);
  return u.toString();
}

/**
 * Stores a new password-reset token (hash + expiry) and emails a one-time link to the web app.
 */
export async function issuePasswordResetAndSend(
  env: Env,
  db: ReturnType<typeof createDb>,
  opts: { userId: string; email: string },
): Promise<{ emailSent: boolean }> {
  const rawToken = randomUrlToken();
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db
    .update(users)
    .set({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    })
    .where(eq(users.id, opts.userId));

  const appOrigin = resolveAppOrigin(env);
  const resetUrl = buildResetUrl(appOrigin, rawToken);

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p>Hi,</p>
  <p>We received a request to reset your TradeBook password. Use the link below to choose a new one.</p>
  <p><a href="${resetUrl}">Reset my password</a></p>
  <p>If the link does not work, copy this URL into your browser:</p>
  <p style="word-break:break-all;font-size:12px">${resetUrl}</p>
  <p>This link expires in one hour. If you did not ask for a reset, you can ignore this email.</p>
</body></html>`;

  const result = await sendTransactionalEmail(env, {
    to: opts.email,
    subject: "Reset your TradeBook password",
    html,
  });

  if (!result.ok && env.ENVIRONMENT !== "production") {
    console.warn("[email] Password reset link (dev, email may not have been sent):", resetUrl);
  }

  return { emailSent: result.ok };
}
