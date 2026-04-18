import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to Tradebook with your email and password.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Log in · Tradebook",
    description: "Sign in to Tradebook with your email and password.",
  },
};

function safeNext(raw: string | undefined): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erased?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  return (
    <PageShell
      title="Log in"
      description="Sign in with the email and password you used to register."
    >
      {sp.erased === "1" ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          Your account and related data have been removed. You can register again with the same email if you wish.
        </p>
      ) : null}
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <LoginForm nextPath={next} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Register
        </Link>
      </p>
    </PageShell>
  );
}
