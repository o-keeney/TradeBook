import type { Metadata } from "next";

const title = "Privacy Policy";
const description =
  "Draft privacy notice for Tradebook (Ireland / GDPR-oriented outline). Replace with counsel-reviewed policy before production.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title,
    description,
    url: "/privacy",
    type: "article",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
