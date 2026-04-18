import { Suspense } from "react";
import { PortfolioProjectDetail } from "@/components/portfolio-project-detail";

export const metadata = {
  title: "Project",
};

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
