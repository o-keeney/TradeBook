import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a link to reset your Tradebook password.",
  alternates: { canonical: "/forgot-password" },
  openGraph: {
    title: "Forgot password · Tradebook",
    description: "Request a password reset link for your Tradebook account.",
  },
};

export default function ForgotPasswordPage() {
  return (
    <PageShell
      title="Forgot password"
      description="Enter the email you use for Tradebook. We will send a one-time link if an account exists."
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Log in
        </Link>
      </p>
    </PageShell>
  );
}
