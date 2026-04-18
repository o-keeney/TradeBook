"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This page hit an unexpected error. Your work is usually still safe — try again, or go back to a stable page.
        </p>
      </header>
      {error.digest ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
