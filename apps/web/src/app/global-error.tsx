"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en-IE">
      <body className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            A critical error prevented the page from loading. You can retry or open the site from the home URL.
          </p>
          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-neutral-500">Ref: {error.digest}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-600"
            >
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
