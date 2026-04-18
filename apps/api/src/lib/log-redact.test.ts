import { describe, expect, it } from "vitest";
import { redactRequestUrlForLog } from "./log-redact";

describe("redactRequestUrlForLog", () => {
  it("returns pathname only when no sensitive query", () => {
    expect(redactRequestUrlForLog("https://api.example.com/api/users/me")).toBe("/api/users/me");
  });

  it("redacts token and preserves other params", () => {
    const out = redactRequestUrlForLog("https://x/api/auth/verify-email?token=abc&foo=1");
    expect(out.startsWith("/api/auth/verify-email?")).toBe(true);
    expect(out).toContain("foo=1");
    expect(out).toMatch(/token=.*redacted/i);
  });

  it("returns invalid marker on bad URL", () => {
    expect(redactRequestUrlForLog("not-a-url")).toBe("[invalid_url]");
  });
});
