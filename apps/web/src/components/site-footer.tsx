import Link from "next/link";

const footerLinks = [
  { href: "/find-tradesmen", label: "Find tradesmen" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--footer-bg)] backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 py-8">
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
    </footer>
  );
}
