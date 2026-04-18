const enc = new TextEncoder();

function base64urlFromUint8(u: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64url(bytes: ArrayBuffer): string {
  return base64urlFromUint8(new Uint8Array(bytes));
}

function base64urlToBytes(s: string): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const raw = atob(b);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type WsTicketPayload = {
  /** user id */
  u: string;
  /** conversation id */
  c: string;
  /** unix seconds */
  exp: number;
};

async function hmacSha256(secret: string, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(data));
}

export async function signWsTicket(secret: string, payload: WsTicketPayload): Promise<string> {
  const body = JSON.stringify(payload);
  const sig = await hmacSha256(secret, body);
  return `${base64urlFromUint8(enc.encode(body))}.${base64url(sig)}`;
}

export async function verifyWsTicket(secret: string, ticket: string): Promise<WsTicketPayload | null> {
  const dot = ticket.indexOf(".");
  if (dot <= 0) return null;
  const bodyB64 = ticket.slice(0, dot);
  const sigB64 = ticket.slice(dot + 1);
  let bodyStr: string;
  try {
    bodyStr = new TextDecoder().decode(base64urlToBytes(bodyB64));
  } catch {
    return null;
  }
  const expected = await hmacSha256(secret, bodyStr);
  let sig: Uint8Array;
  try {
    sig = base64urlToBytes(sigB64);
  } catch {
    return null;
  }
  const expBuf = new Uint8Array(expected);
  if (sig.length !== expBuf.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig[i]! ^ expBuf[i]!;
  if (diff !== 0) return null;

  let parsed: WsTicketPayload;
  try {
    parsed = JSON.parse(bodyStr) as WsTicketPayload;
  } catch {
    return null;
  }
  if (typeof parsed.u !== "string" || typeof parsed.c !== "string" || typeof parsed.exp !== "number") {
    return null;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.exp < nowSec) return null;
  return parsed;
}
