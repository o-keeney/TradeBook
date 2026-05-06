import Link from "next/link";
import { AdSlot } from "@/components/ad-slot";
import { getPublicApiUrl } from "@/lib/public-env";

const tradesmanFeatures = [
  "Showcase completed work in a public portfolio.",
  "Discover open jobs, submit quotes, and respond to direct requests.",
  "Manage delivery with task planning, appointments, updates, and messaging.",
  "Track job spend with an itemized expense ledger and live total.",
] as const;

const customerFeatures = [
  "Find and compare providers through verified profiles and portfolios.",
  "Publish direct or open jobs, then review, accept, or reject quotes.",
  "Oversee progress with shared timelines, status tracking, appointments, and messaging.",
] as const;

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-5 space-y-2.5 text-sm text-[var(--muted)]">
      {items.map((text) => (
        <li key={text} className="flex gap-2.5">
          <span className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden>
            ✓
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

async function fetchSiteConfig(): Promise<{ tradesmanMonthlyEuros: number; firstMonthFreeDays: number }> {
  const base = getPublicApiUrl().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/public/site-config`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { tradesmanMonthlyEuros: 30, firstMonthFreeDays: 30 };
    const data = (await res.json()) as {
      tradesmanMonthlyEuros?: unknown;
      firstMonthFreeDays?: unknown;
    };
    const n = Number(data.tradesmanMonthlyEuros);
    const days = Number(data.firstMonthFreeDays);
    return {
      tradesmanMonthlyEuros: Number.isFinite(n) && n >= 0 ? n : 30,
      firstMonthFreeDays: Number.isFinite(days) && days > 0 ? Math.round(days) : 30,
    };
  } catch {
    return { tradesmanMonthlyEuros: 30, firstMonthFreeDays: 30 };
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

const homeCardFootnoteClass =
  "rounded-xl bg-gradient-to-br from-indigo-50/90 to-white px-5 py-4 shadow-inner ring-1 ring-indigo-100/80 dark:from-neutral-900 dark:to-neutral-950 dark:ring-neutral-800";

export default async function Home() {
  const { tradesmanMonthlyEuros, firstMonthFreeDays } = await fetchSiteConfig();

  return (
    <div>
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--hero-gradient-from)] to-[var(--background)] px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl">
            TradeBook
          </p>
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">Ireland</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Find tradespeople. Run jobs. Stay in control.
          </h1>
          <p className="mt-4 text-pretty text-[var(--muted)]">
            Tradebook connects customers with trades across crafts: discovery, quotes, and job tracking in one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <article className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-8">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Are you a service provider?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Win more work, run jobs efficiently, and present your business professionally.
            </p>
            <FeatureList items={tradesmanFeatures} />
            <div className="mt-auto pt-8">
              <Link href="/register/tradesman" className="tb-btn-primary-lg">
                Register now
              </Link>
              <div className="mt-6 border-t border-[var(--border)] pt-6 dark:border-neutral-800">
                <div className={homeCardFootnoteClass}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                    Monthly plan
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">
                      {formatMonthlyEuros(tradesmanMonthlyEuros)}
                    </span>
                    <span className="text-sm font-medium text-[var(--muted)]">per month</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    First {firstMonthFreeDays} days free
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-8">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">For customers</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Source the right provider, compare offers, and keep every job under control.
            </p>
            <FeatureList items={customerFeatures} />
            <div className="mt-auto pt-8">
              <Link href="/register/customer" className="tb-btn-primary-lg">
                Create a free account
              </Link>
              <div className="mt-6 border-t border-[var(--border)] pt-6 dark:border-neutral-800">
                <div className={homeCardFootnoteClass}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                    Customer accounts
                  </p>
                  <div className="mt-2">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">Free</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <nav
          aria-label="Popular pages"
          className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6 dark:border-neutral-800 dark:bg-neutral-950 sm:px-8"
        >
          <h2 className="text-base font-semibold text-[var(--foreground)]">Explore Tradebook</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted-foreground)]">
            <li>
              <Link
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/how-it-works"
              >
                How it works
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/find-tradesmen"
              >
                Find tradesmen
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/work-orders"
              >
                Work orders
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/contact"
              >
                Contact
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/login"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/terms"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/privacy"
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </nav>

        <div className="mt-12">
          <AdSlot placement="home_under_hero" />
        </div>
      </section>
    </div>
  );
}
