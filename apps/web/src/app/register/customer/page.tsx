import { RegisterForm } from "@/components/register-form";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Register as a customer",
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
