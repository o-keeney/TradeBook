import type { Env } from "../env";

export type SendEmailResult = { ok: true } | { ok: false; reason: string };

/** Trims and removes a single pair of surrounding quotes (common .env mistake). */
function normalizeEnvString(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

/**
 * Sends one transactional message via Brevo (Sendinblue) HTTP API.
 * @see https://developers.brevo.com/reference/sendtransacemail
 */
export async function sendTransactionalEmail(
  env: Env,
  opts: { to: string; subject: string; html: string },
): Promise<SendEmailResult> {
  const key = normalizeEnvString(env.BREVO_API_KEY);
  const senderEmail = normalizeEnvString(env.BREVO_SENDER_EMAIL);
  const senderName = normalizeEnvString(env.BREVO_SENDER_NAME) || "TradeBook";

  if (!key) {
    if (env.ENVIRONMENT !== "production") {
      console.warn(
        "[email] BREVO_API_KEY is not set; transactional email is skipped. Set the secret for production.",
      );
    }
    return { ok: false, reason: "email_not_configured" };
  }

  if (!senderEmail) {
    if (env.ENVIRONMENT !== "production") {
      console.warn(
        "[email] BREVO_SENDER_EMAIL is not set; add it to [vars] or .dev.vars (must be a verified sender in Brevo).",
      );
    }
    return { ok: false, reason: "email_not_configured" };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[email] Brevo error", res.status, text);
    if (res.status === 401) {
      console.error(
        "[email] Brevo rejected the key. In Brevo: SMTP & API → API keys → create/copy a v3 key (usually starts with xkeysib-). Do not use the SMTP password. No spaces or extra quotes in .dev.vars.",
      );
    }
    return { ok: false, reason: "provider_error" };
  }

  return { ok: true };
}
