import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Tradebook account, email verification, data export, and shortcuts to jobs and portfolio.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "Dashboard · Tradebook",
    description: "Your Tradebook account and shortcuts to jobs and portfolio.",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
