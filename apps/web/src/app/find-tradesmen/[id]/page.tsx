import type { Metadata } from "next";
import { getPublicApiUrl } from "@/lib/public-env";
import { TradesmanPublicProfileRoute } from "./tradesman-public-profile-route";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const base = getPublicApiUrl().replace(/\/$/, "");
  let title = "Tradesperson";
  let description = "Public profile and portfolio on Tradebook.";
  try {
    const res = await fetch(`${base}/api/tradesmen/${encodeURIComponent(id)}`, {
      next: { revalidate: 120 },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        profile?: {
          displayName?: string;
          companyName?: string | null;
          region?: Record<string, unknown>;
          tradeCategories?: string[];
        };
      };
      const p = data.profile;
      if (p?.displayName?.trim()) title = p.displayName.trim();
      const parts: string[] = [];
      if (p?.companyName?.trim()) parts.push(p.companyName.trim());
      const addr = p?.region?.serviceAddress;
      if (typeof addr === "string" && addr.trim()) parts.push(addr.trim());
      if (p?.tradeCategories?.length) parts.push(p.tradeCategories.join(", "));
      if (parts.length) description = parts.join(" · ").slice(0, 200);
    }
  } catch {
    /* ignore */
  }
  return {
    title: `${title} · Tradebook`,
    description,
    alternates: { canonical: `/find-tradesmen/${id}` },
    openGraph: {
      title: `${title} · Tradebook`,
      description,
      url: `/find-tradesmen/${id}`,
    },
  };
}

export default async function TradesmanPublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  return <TradesmanPublicProfileRoute userId={id} />;
}
