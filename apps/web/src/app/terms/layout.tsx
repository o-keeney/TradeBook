import type { Metadata } from "next";

const title = "Terms of Service";
const description =
  "Draft terms of use for the Tradebook platform (Ireland). Replace with counsel-reviewed text before production.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
  openGraph: {
    title,
    description,
    url: "/terms",
    type: "article",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
