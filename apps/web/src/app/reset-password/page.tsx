import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Tradebook account.",
};

function ResetFallback() {
  return <p className="text-sm text-neutral-500">Loading…</p>;
}

export default function ResetPasswordPage() {
  return (
    <PageShell
      title="Reset password"
      description="Choose a new password. You will be signed out of other devices until you log in again."
    >
      <Suspense fallback={<ResetFallback />}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/login" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Back to log in
        </Link>
      </p>
    </PageShell>
  );
}
