import type { ReactNode } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Email verification",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>;
}) {
  const sp = await searchParams;

  let title = "Email verification";
  let body: ReactNode;

  if (sp.verified === "1") {
    title = "Email verified";
    body = (
      <>
        <p className="text-neutral-700 dark:text-neutral-300">
          Your email address is confirmed. You can use the full site, including posting jobs and
          managing your portfolio.
        </p>
        <p className="mt-6">
          <Link
            href="/dashboard"
            className="font-medium text-neutral-900 underline dark:text-neutral-100"
          >
            Go to dashboard →
          </Link>
        </p>
      </>
    );
  } else if (sp.error === "expired") {
    title = "Link expired";
    body = (
      <>
        <p className="text-neutral-700 dark:text-neutral-300">
          This verification link has expired. Sign in and request a new email from your dashboard.
        </p>
        <p className="mt-6">
          <Link
            href="/login?next=/dashboard"
            className="font-medium text-neutral-900 underline dark:text-neutral-100"
          >
            Log in →
          </Link>
        </p>
      </>
    );
  } else {
    title = "Verification link invalid";
    body = (
      <>
        <p className="text-neutral-700 dark:text-neutral-300">
          This link is invalid or has already been used. If you still need to verify, sign in and
          send a new verification email from your dashboard.
        </p>
        <p className="mt-6">
          <Link
            href="/login?next=/dashboard"
            className="font-medium text-neutral-900 underline dark:text-neutral-100"
          >
            Log in →
          </Link>
        </p>
      </>
    );
  }

  return (
    <PageShell title={title} description="">
      <div className="max-w-md space-y-2 text-sm">{body}</div>
    </PageShell>
  );
}
