import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  description: "Job conversations between customers and assigned tradespeople on Tradebook.",
  alternates: { canonical: "/messages" },
  robots: { index: false, follow: false },
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
