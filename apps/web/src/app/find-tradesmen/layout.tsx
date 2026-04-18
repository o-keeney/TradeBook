import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find tradesmen",
  description:
    "Search rated tradespeople in Ireland by trade, area, or county. Filter by availability and minimum review score.",
  alternates: {
    canonical: "/find-tradesmen",
  },
  openGraph: {
    title: "Find tradesmen · Tradebook",
    description:
      "Search rated tradespeople in Ireland by trade, area, or county. Filter by availability and minimum review score.",
  },
};

export default function FindTradesmenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
