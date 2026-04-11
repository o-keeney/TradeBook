import { RegisterForm } from "@/components/register-form";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Register now",
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
