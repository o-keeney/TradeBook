import { RegisterForm } from "@/components/register-form";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <PageShell
      title="Create an account"
      description="Customers post jobs; tradespeople manage work and portfolio. Ireland only."
    >
      <RegisterForm />
    </PageShell>
  );
}
