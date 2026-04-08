import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env } from "../env";

export const SESSION_COOKIE = "tradebook_session";

/** 30 days */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions(c: Context<{ Bindings: Env }>) {
  const isProd = c.env.ENVIRONMENT === "production";
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: isProd,
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function readSessionId(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function setSessionCookie(
  c: Context<{ Bindings: Env }>,
  sessionId: string,
): void {
  setCookie(c, SESSION_COOKIE, sessionId, cookieOptions(c));
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
