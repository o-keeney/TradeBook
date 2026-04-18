import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Register",
};

export default function RegisterChooserPage() {
  return (
    <PageShell
      title="Create an account"
      description="Choose the registration path that matches how you will use Tradebook."
    >
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <Link
          href="/register/customer"
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-400 hover:shadow dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
        >
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Customer
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Post jobs, compare bids, and track work with tradespeople.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-neutral-900 underline dark:text-neutral-100">
            Customer registration →
          </span>
        </Link>
        <Link
          href="/register/tradesman"
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-400 hover:shadow dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
        >
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Tradesperson
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Portfolio, bids, job timelines, and a public profile for customers to find you.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-neutral-900 underline dark:text-neutral-100">
            Tradesman registration →
          </span>
        </Link>
      </div>
    </PageShell>
  );
}
