import Link from "next/link";

const footerLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/find-tradesmen", label: "Find tradesmen" },
  { href: "/work-orders", label: "Work orders" },
  { href: "/contact", label: "Contact us" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)]/70 bg-[var(--footer-bg)] backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/75 p-5 shadow-[0_10px_35px_rgb(15_23_42_/0.05)] sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Tradebook</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
              Trades discovery and job coordination in Ireland.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-8 text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} Tradebook. Legal pages are drafts until reviewed by qualified counsel.
        </p>
        </div>
      </div>
    </footer>
  );
}
