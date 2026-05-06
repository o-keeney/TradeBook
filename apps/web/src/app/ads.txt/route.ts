function adsTxtBody(): string {
  const pub = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER?.trim();
  if (!pub || !/^ca-pub-\d+$/i.test(pub)) {
    return "# ads.txt not configured\n";
  }
  const publisherId = pub.replace(/^ca-/i, "");
  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
}

export function GET(): Response {
  return new Response(adsTxtBody(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
