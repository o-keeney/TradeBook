import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How customers and tradespeople use Tradebook: discovery, work orders, messages, and reviews.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How it works · Tradebook",
    description: "Overview of the customer and tradesman journey on Tradebook.",
  },
};

const cardClass =
  "rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-8";

export default function HowItWorksPage() {
  return (
    <PageShell
      title="How it works"
      description="Tradebook connects homeowners and businesses with trades across Ireland: public profiles, structured jobs, and clear status from quote to completion."
      maxWidth="wide"
    >
      <div className="grid gap-8 md:grid-cols-2">
        <section className={cardClass} aria-labelledby="how-customers">
          <h2 id="how-customers" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            For customers
          </h2>
          <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Create a free account</strong> and verify
              your email when prompted (required for posting jobs and messaging in normal operation).
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Find tradespeople</strong> using trade and
              area filters, then open a profile to see portfolio and reviews.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Request work or post a job</strong> as a
              direct assignment or an open bid; compare quotes, award a tradesman, and track status on the work order.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Message and upload photos</strong> on
              assigned jobs; when the job is completed, you can leave a review.
            </li>
          </ol>
          <p className="mt-6">
            <Link
              href="/register/customer"
              className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
            >
              Register as a customer
            </Link>
          </p>
        </section>

        <section className={cardClass} aria-labelledby="how-trades">
          <h2 id="how-trades" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            For tradespeople
          </h2>
          <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Register</strong> and complete your public
              profile: trades, service area, optional contact visibility, and profile photo.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Build your portfolio</strong> with dated
              projects and photos — customers see this on Find tradesmen.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Bid on open jobs</strong> or accept /
              decline direct requests; use the planner and timeline to keep the customer informed.
            </li>
            <li>
              <strong className="text-neutral-900 dark:text-neutral-100">Earn reviews</strong> after completed jobs to
              build your reputation on the platform.
            </li>
          </ol>
          <p className="mt-6">
            <Link
              href="/register/tradesman"
              className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
            >
              Register as a tradesman
            </Link>
          </p>
        </section>
      </div>

      <section
        className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/40 sm:p-8"
        aria-labelledby="how-billing-note"
      >
        <h2 id="how-billing-note" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Plans and billing
        </h2>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Customer accounts are free. Tradesman listings reference a monthly plan on the home page; full checkout and
          subscription enforcement will appear here once billing is connected for your organisation.
        </p>
      </section>

      <p className="mt-10 text-center text-sm text-neutral-600 dark:text-neutral-400">
        Questions?{" "}
        <Link href="/contact" className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
          Contact us
        </Link>
        .
      </p>
    </PageShell>
  );
}
