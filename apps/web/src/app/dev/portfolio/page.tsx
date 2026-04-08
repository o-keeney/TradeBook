import { PortfolioSandbox } from "@/components/portfolio-sandbox";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Portfolio",
};

export default function DevPortfolioPage() {
  return (
    <PageShell
      title="Portfolio"
      description="Tradesman-only flows: create projects, upload compressed images to R2, and fetch a public portfolio by user id."
    >
      <PortfolioSandbox />
    </PageShell>
  );
}
