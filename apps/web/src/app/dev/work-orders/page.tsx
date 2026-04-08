import { WorkOrdersSandbox } from "@/components/work-orders-sandbox";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Work orders",
};

export default function DevWorkOrdersPage() {
  return (
    <PageShell
      title="Work orders"
      description="Customers and tradesmen: create jobs, bids, awards, timeline notes, and status updates. Switch accounts in separate browser profiles if needed."
    >
      <WorkOrdersSandbox />
    </PageShell>
  );
}
