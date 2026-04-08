/** Browser + server: must use NEXT_PUBLIC_* for values required on the client. */
export function getPublicApiUrl(): string {
  // Use the same host style as the Next dev server (localhost vs 127.0.0.1) so session cookies match the API origin.
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
}
