import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function TermsPage() {
  return (
    <PageShell
      title="Terms of Service (draft)"
      description="Summary placeholder for development and early testers. This is not legal advice and must be replaced with counsel-approved terms before a public launch."
    >
      <div className="space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>Draft only.</strong> Have a solicitor qualified in Irish and EU law review and replace this
          document before you rely on it commercially.
        </p>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">1. The service</h2>
          <p className="mt-2">
            Tradebook provides an online platform to help customers discover tradespeople, coordinate work, and
            communicate about jobs. Features may change during beta.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">2. Accounts and eligibility</h2>
          <p className="mt-2">
            You must provide accurate registration information, keep credentials secure, and use the service
            lawfully. We may suspend or close accounts that breach these terms or pose a risk to others.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">3. Trades work and payments</h2>
          <p className="mt-2">
            Contracts for physical work are between customers and tradespeople. Tradebook is not a party to those
            contracts unless explicitly stated elsewhere. Payment processing, deposits, and disputes should follow
            your agreed paperwork and applicable law.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">4. Acceptable use</h2>
          <p className="mt-2">
            No harassment, fraud, malware, scraping that overloads the service, or attempts to bypass security.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            5. Content and intellectual property
          </h2>
          <p className="mt-2">
            You retain rights in content you upload. You grant Tradebook a limited licence to host, display, and
            operate the service with that content. Do not upload material you do not have rights to use.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">6. Disclaimers and liability</h2>
          <p className="mt-2">
            The service is provided on an “as is” basis to the extent permitted by law. Limits on liability should
            be drafted with counsel for your entity and jurisdiction.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">7. Changes</h2>
          <p className="mt-2">
            We may update these terms. Material changes should be communicated according to a process your counsel
            defines.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">8. Contact</h2>
          <p className="mt-2">
            Questions about the product: see our{" "}
            <Link href="/contact" className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100">
              contact
            </Link>{" "}
            page.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
