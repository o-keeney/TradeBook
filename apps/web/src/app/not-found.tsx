import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell
      title="Page not found"
      description="That URL does not match any page on Tradebook. It may have been removed or typed incorrectly."
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Try the home page, find tradespeople, or sign in to reach your dashboard and jobs.
      </p>
      <ul className="mt-8 flex flex-col gap-3 text-sm font-medium">
        <li>
          <Link
            href="/"
            className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/find-tradesmen"
            className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            Find tradesmen
          </Link>
        </li>
        <li>
          <Link
            href="/how-it-works"
            className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            How it works
          </Link>
        </li>
        <li>
          <Link
            href="/login"
            className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            Sign in
          </Link>
        </li>
        <li>
          <Link
            href="/contact"
            className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            Contact
          </Link>
        </li>
      </ul>
    </PageShell>
  );
}
