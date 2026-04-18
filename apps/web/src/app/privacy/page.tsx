import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy (draft)"
      description="High-level description of how Tradebook may handle personal data. This is a development placeholder and not a substitute for a GDPR-compliant privacy notice reviewed by counsel."
    >
      <div className="space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>Draft only.</strong> A qualified privacy lawyer should review this against your actual processing
          activities, subprocessors, and Irish/EU requirements before launch.
        </p>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">1. Who we are</h2>
          <p className="mt-2">
            Tradebook operates a web application for trades discovery and job coordination, primarily aimed at users
            in Ireland. The “data controller” identity and contact details should be inserted here for production.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">2. Data we may collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Account details: name, email, phone where provided, role (customer or tradesman), and authentication
              data. At registration we may record a consent audit entry (timestamp, IP, user agent, and the
              GDPR-related choices you ticked).
            </li>
            <li>Profile and portfolio content you choose to publish.</li>
            <li>Work order and messaging content needed to run the product.</li>
            <li>Technical logs: IP address, user agent, timestamps—typically for security and debugging (retention TBD).</li>
            <li>Contact form submissions you send via the site.</li>
          </ul>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            3. Purposes and legal bases (GDPR outline)
          </h2>
          <p className="mt-2">
            Processing may rely on contract (providing the service), legitimate interests (security, product
            improvement—balanced against your rights), consent where required (e.g. marketing), and legal obligation
            where applicable. Your counsel should map each processing activity to a specific Article 6 basis.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">4. Sharing and subprocessors</h2>
          <p className="mt-2">
            Infrastructure providers (e.g. hosting, email, maps, payments) may process data on our instructions. List
            actual vendors, transfer mechanisms (SCCs, etc.), and categories of data in the final policy.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">5. Retention</h2>
          <p className="mt-2">
            Data is kept only as long as needed for the purposes above and as required by law. Define retention periods
            per data category in the final document.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">6. Your rights</h2>
          <p className="mt-2">
            Depending on jurisdiction, you may have rights to access, rectify, erase, restrict, object, and port
            data, and to lodge a complaint with a supervisory authority (in Ireland, the Data Protection Commission).
            Signed-in users with a verified email can download a JSON export and request account erasure from the
            dashboard; behaviour should be reviewed with counsel before production.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">7. Cookies and similar technologies</h2>
          <p className="mt-2">
            Session cookies are used for login. A separate non-HttpOnly CSRF cookie may be set so the app can send
            matching anti-forgery headers on writes. The site shows a consent banner for optional analytics/marketing
            categories (stored in the browser only until you wire real tools). Add granular controls if you enable
            non-essential cookies or advertising technology.
          </p>
        </section>

        <section className="scroll-mt-20">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">8. Contact</h2>
          <p className="mt-2">
            For privacy requests, your production policy should name a contact channel. For product questions, use{" "}
            <Link href="/contact" className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100">
              Contact
            </Link>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}
