/** Query parameter names whose values must not appear in logs. */
const REDACT_QUERY_KEYS = new Set([
  "token",
  "code",
  "state",
  "password",
  "access_token",
  "refresh_token",
  "session",
  "reset_token",
]);

/**
 * Returns a pathname + optional redacted query string safe for structured logs.
 */
export function redactRequestUrlForLog(urlString: string): string {
  try {
    const u = new URL(urlString);
    const sp = u.searchParams;
    let changed = false;
    for (const key of REDACT_QUERY_KEYS) {
      if (sp.has(key)) {
        sp.set(key, "[redacted]");
        changed = true;
      }
    }
    const q = changed || sp.toString() ? sp.toString() : "";
    return q ? `${u.pathname}?${q}` : u.pathname;
  } catch {
    return "[invalid_url]";
  }
}
