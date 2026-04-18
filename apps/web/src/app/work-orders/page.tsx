import type { Metadata } from "next";
import { WorkOrdersHub } from "@/components/work-orders-hub";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Work orders",
  description: "Your Tradebook jobs: post or bid on work orders, timelines, and status updates.",
  alternates: { canonical: "/work-orders" },
  openGraph: {
    title: "Work orders · Tradebook",
    description: "Manage jobs, bids, and timelines on Tradebook.",
  },
};

export default function WorkOrdersPage() {
  return (
    <PageShell title="Work orders" maxWidth="wide" description="Your jobs and bidding opportunities.">
      <WorkOrdersHub />
    </PageShell>
  );
}
