import type { Metadata } from "next";
import { headers } from "next/headers";
import { WorkOrderDetail } from "@/components/work-order-detail";
import { getPublicApiUrl } from "@/lib/public-env";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cookie = (await headers()).get("cookie") ?? "";
  const base = getPublicApiUrl().replace(/\/$/, "");
  let title = "Job";
  let description = "View and manage a work order on Tradebook.";
  try {
    const res = await fetch(`${base}/api/work-orders/${encodeURIComponent(id)}`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        workOrder?: { title?: string; tradeCategory?: string };
      };
      const wo = data.workOrder;
      if (wo?.title) {
        title = wo.title.slice(0, 200);
        const cat = wo.tradeCategory?.replace(/-/g, " ") ?? "Job";
        description = `${cat}: ${wo.title.slice(0, 120)}`;
      }
    }
  } catch {
    /* ignore */
  }
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/work-orders/${id}` },
    openGraph: {
      title,
      description,
      url: `/work-orders/${id}`,
    },
  };
}

export default function WorkOrderPage() {
  return <WorkOrderDetail />;
}
