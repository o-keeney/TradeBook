import { WorkOrdersHub } from "@/components/work-orders-hub";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Work orders",
};

export default function WorkOrdersPage() {
  return (
    <PageShell title="Work orders" maxWidth="wide" description="Your jobs and bidding opportunities.">
      <WorkOrdersHub />
    </PageShell>
  );
}
