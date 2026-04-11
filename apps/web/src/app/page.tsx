import Link from "next/link";
import { getPublicApiUrl } from "@/lib/public-env";

const tradesmanFeatures = [
  "Showcase work in a public portfolio with photos and project notes.",
  "See work orders in your area, place bids, and win jobs.",
  "Track each job with timelines, status updates, and customer communication.",
  "Build a profile customers can share and look up when you are ready to quote.",
] as const;

const customerFeatures = [
  "Browse tradespeople: open a profile and see their public portfolio.",
  "Post work orders, compare bids, and follow each job in one timeline.",
  "Stay in the loop with status updates instead of scattered texts and calls.",
] as const;

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-5 space-y-2.5 text-sm text-neutral-600 dark:text-neutral-400">
      {items.map((text) => (
        <li key={text} className="flex gap-2.5">
          <span
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          >
            ✓
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

async function fetchTradesmanMonthlyEuros(): Promise<number> {
  const base = getPublicApiUrl().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/public/site-config`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return 30;
    const data = (await res.json()) as { tradesmanMonthlyEuros?: unknown };
    const n = Number(data.tradesmanMonthlyEuros);
    return Number.isFinite(n) && n >= 0 ? n : 30;
  } catch {
    return 30;
  }
}

function formatMonthlyEuros(euros: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(euros);
}

export default async function Home() {
  const tradesmanMonthlyEuros = await fetchTradesmanMonthlyEuros();
  const priceLine = `${formatMonthlyEuros(tradesmanMonthlyEuros)} per month`;

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
            Tradebook connects customers with trades across crafts: discovery, quotes, and job
            tracking in one place. This site is under active development.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <article className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-8">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Are you a service provider?
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Register now to benefit from the perks of our platform.
            </p>
            <FeatureList items={tradesmanFeatures} />
            <div className="mt-8">
              <Link
                href="/register/tradesman"
                className="inline-flex rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
              >
                Register now
              </Link>
              <p className="mt-5 border-t border-neutral-200 pt-5 text-base font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
                {priceLine}
              </p>
            </div>
          </article>

          <article className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-8">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              For homeowners &amp; customers
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Use Tradebook to discover trades, compare work, and stay on top of jobs as we roll
              out the full customer experience.
            </p>
            <FeatureList items={customerFeatures} />
            <div className="mt-8">
              <Link
                href="/register/customer"
                className="inline-flex rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
              >
                Create a free account
              </Link>
            </div>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
              Have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-neutral-700 underline dark:text-neutral-300"
              >
                Log in
              </Link>{" "}
              to open your dashboard.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
