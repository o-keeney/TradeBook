import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Register as a customer",
  description: "Sign up to post work orders, compare bids, and track jobs with tradespeople on Tradebook.",
  alternates: { canonical: "/register/customer" },
  openGraph: {
    title: "Register as a customer · Tradebook",
    description: "Customer registration for Tradebook — jobs, bids, and timelines in one place.",
  },
};

export default function RegisterCustomerPage() {
  return (
    <PageShell
      title="Register as a customer"
      description="For customers hiring tradespeople: post work orders, review bids, and follow jobs. Ireland only."
    >
      <RegisterForm
        role="customer"
        alternateRegisterHref="/register/tradesman"
        alternateRegisterLabel="Are you a tradesperson?"
      />
    </PageShell>
  );
}
