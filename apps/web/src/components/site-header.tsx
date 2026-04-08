"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthNav } from "@/components/auth-nav";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/find-tradesmen", label: "Find tradesmen" },
] as const;

const devLinks = [
  { href: "/dev", label: "Dev hub" },
  { href: "/dev/auth", label: "Auth" },
  { href: "/dev/portfolio", label: "Portfolio" },
  { href: "/dev/work-orders", label: "Work orders" },
] as const;

function linkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/dev") return pathname === "/dev";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-[var(--background)]/95 backdrop-blur dark:border-neutral-800/80">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Tradebook
            </Link>
            <nav className="flex flex-wrap gap-x-1 gap-y-2 text-sm">
              {primaryLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-2.5 py-1.5 transition-colors ${
                    linkActive(pathname, href)
                      ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <AuthNav />
        </div>
        <nav
          aria-label="Development tools"
          className="mt-3 flex flex-wrap gap-x-1 gap-y-1 border-t border-neutral-200 pt-3 text-xs dark:border-neutral-800"
        >
          <span className="mr-2 text-neutral-400">Dev:</span>
          {devLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded px-2 py-1 transition-colors ${
                linkActive(pathname, href)
                  ? "bg-neutral-200 font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-500 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
