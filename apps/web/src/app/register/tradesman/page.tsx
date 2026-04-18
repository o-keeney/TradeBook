import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Register as a tradesperson",
  description: "Sign up to list your trade, build a public portfolio, bid on jobs, and manage work on Tradebook.",
  alternates: { canonical: "/register/tradesman" },
  openGraph: {
    title: "Register as a tradesperson · Tradebook",
    description: "Tradesperson registration for Tradebook — portfolio, bids, and job timelines.",
  },
};

export default function RegisterTradesmanPage() {
  return (
    <PageShell
      title="Register now"
      description="Are you a service provider? Register now to benefit from the perks of our platform. Ireland only."
    >
      <RegisterForm
        role="tradesman"
        alternateRegisterHref="/register/customer"
        alternateRegisterLabel="Looking to hire a tradesperson instead?"
      />
    </PageShell>
  );
}
