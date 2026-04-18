import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioProjectDetail } from "@/components/portfolio-project-detail";

type PageProps = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: "Portfolio project",
    description: "View and edit one of your portfolio projects on Tradebook.",
    robots: { index: false, follow: false },
    alternates: { canonical: `/portfolio/${projectId}` },
  };
}

export default function PortfolioProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-neutral-500">
          Loading…
        </div>
      }
    >
      <PortfolioProjectDetail />
    </Suspense>
  );
}
