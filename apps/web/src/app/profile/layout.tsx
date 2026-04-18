import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Edit how you appear on Find tradesmen: bio, trades, service area, and contact options.",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
