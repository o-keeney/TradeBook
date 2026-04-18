import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env } from "../env";
import { SESSION_TTL_MS } from "./session-cookie";

export const CSRF_COOKIE = "tradebook_csrf";

/** 64 hex chars (32 random bytes). */
export function newCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function csrfCookieOptions(c: Context<{ Bindings: Env }>) {
  const isProd = c.env.ENVIRONMENT === "production";
  return {
    path: "/",
    httpOnly: false,
    sameSite: "Lax" as const,
    secure: isProd,
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function readCsrfTokenFromCookie(c: Context): string | undefined {
  const raw = getCookie(c, CSRF_COOKIE)?.trim();
  if (!raw || !/^[0-9a-f]{64}$/i.test(raw)) return undefined;
  return raw.toLowerCase();
}

export function setCsrfCookie(c: Context<{ Bindings: Env }>, token?: string): string {
  const t = (token ?? newCsrfToken()).toLowerCase();
  setCookie(c, CSRF_COOKIE, t, csrfCookieOptions(c));
  return t;
}

export function clearCsrfCookie(c: Context): void {
  deleteCookie(c, CSRF_COOKIE, { path: "/" });
}

/**
 * Ensures a valid CSRF cookie when the caller already has a session (e.g. first `GET /api/users/me` after deploy).
 */
export function ensureCsrfCookie(c: Context<{ Bindings: Env }>): void {
  if (readCsrfTokenFromCookie(c)) return;
  setCsrfCookie(c);
}
