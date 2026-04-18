import { WorkOrdersSandbox } from "@/components/work-orders-sandbox";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Work orders (sandbox)",
};

export default function DevWorkOrdersSandboxPage() {
  return (
    <PageShell
      title="Work orders — API sandbox"
      description="Raw tools to create jobs, bids, awards, and updates against the API. Prefer the main Work orders page for browsing."
    >
      <WorkOrdersSandbox />
    </PageShell>
  );
}
