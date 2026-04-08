import Link from "next/link";
import { PageShell } from "@/components/page-shell";

const tools = [
  {
    href: "/dev/auth",
    title: "Auth",
    description: "Register, login, session cookies, and GET /api/users/me.",
  },
  {
    href: "/dev/portfolio",
    title: "Portfolio",
    description: "Tradesman projects, image uploads (R2), and public portfolio JSON.",
  },
  {
    href: "/dev/work-orders",
    title: "Work orders",
    description: "Open bids, quotes, awards, timeline, and status changes.",
  },
] as const;

export const metadata = {
  title: "Dev hub",
};

export default function DevHubPage() {
  return (
    <PageShell
      title="Developer hub"
      description="Non-production pages used to exercise the API during development. Remove or protect these routes before a public launch."
    >
      <ul className="space-y-3">
        {tools.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="block rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/50"
            >
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {t.title}
              </span>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {t.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
