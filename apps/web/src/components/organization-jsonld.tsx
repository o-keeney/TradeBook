const defaultOrigin = "http://localhost:3000";

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultOrigin;
  try {
    const u = new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
    return u.toString();
  } catch {
    return defaultOrigin;
  }
}

/** Organization structured data for search engines (root layout). */
export function OrganizationJsonLd() {
  const url = siteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tradebook",
    url,
    description: "Trades discovery and job coordination (Ireland)",
    areaServed: {
      "@type": "Country",
      name: "Ireland",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
