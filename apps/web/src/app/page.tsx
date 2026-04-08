import Link from "next/link";
import { getPublicApiUrl } from "@/lib/public-env";

export default function Home() {
  const apiUrl = getPublicApiUrl();
  return (
    <main>
      <section className="border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-[var(--background)] px-4 py-16 dark:border-neutral-800 dark:from-neutral-950 dark:to-[var(--background)] sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Ireland
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
            Find tradespeople. Run jobs. Stay in control.
          </h1>
          <p className="mt-4 text-pretty text-neutral-600 dark:text-neutral-400">
            Tradebook connects customers with trades across crafts—discovery, quotes, and job
            tracking in one place. This site is under active development.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dev"
              className="inline-flex rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              Developer tools
            </Link>
            <Link
              href="/dev/auth"
              className="inline-flex rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              Try auth
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-12">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Stack
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <li>Next.js frontend (Cloudflare-ready)</li>
          <li>Hono API on Workers · D1 · R2</li>
          <li>API base for local dev:{" "}
            <code className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-800">
              {apiUrl}
            </code>
          </li>
        </ul>
      </section>
    </main>
  );
}
