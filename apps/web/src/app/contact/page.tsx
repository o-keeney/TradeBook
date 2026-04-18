import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send feedback, report bugs, or suggest improvements for Tradebook.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact · Tradebook",
    description: "Reach the Tradebook team with feedback, bugs, or ideas.",
  },
};

export default function ContactPage() {
  return (
    <PageShell
      title="Contact us"
      description="Use this form for bugs, product ideas, or general questions. We read every submission."
    >
      <ContactForm />
    </PageShell>
  );
}
