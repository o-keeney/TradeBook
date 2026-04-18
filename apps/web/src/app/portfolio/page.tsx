import { PortfolioSandbox } from "@/components/portfolio-sandbox";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Portfolio",
};

export default function PortfolioPage() {
  return (
    <PageShell
      title="Portfolio"
      description="Create and manage projects that appear on your public tradesman profile."
    >
      <PortfolioSandbox />
    </PageShell>
  );
}
