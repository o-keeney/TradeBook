import type { Metadata } from "next";
import { TradesmanPortfolioManager } from "@/components/portfolio-sandbox";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Manage portfolio projects and photos shown on your public tradesman profile.",
  alternates: { canonical: "/portfolio" },
  openGraph: {
    title: "Portfolio · Tradebook",
    description: "Showcase completed work on your Tradebook public profile.",
  },
};

export default function PortfolioPage() {
  return (
    <PageShell
      title="Portfolio"
      description="Create and manage projects that appear on your public tradesman profile."
    >
      <TradesmanPortfolioManager />
    </PageShell>
  );
}
