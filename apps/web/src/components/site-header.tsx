"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthNav, type MeUser } from "@/components/auth-nav";
import { apiFetch } from "@/lib/api";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/find-tradesmen", label: "Find tradesmen" },
] as const;

const tradesmanNavLinks = [
  { href: "/dev/portfolio", label: "Portfolio" },
  { href: "/dev/work-orders", label: "Work orders" },
] as const;

const adminNavLinks = [{ href: "/admin", label: "Admin" }] as const;

function linkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function primaryNavLinkClass(pathname: string, href: string): string {
  return `rounded-md px-2.5 py-1.5 transition-colors ${
    linkActive(pathname, href)
      ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
  }`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/users/me");
      if (res.status === 401) {
        setUser(null);
        return;
      }
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: MeUser };
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

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
            <nav className="flex flex-wrap gap-x-1 gap-y-2 text-sm" aria-label="Primary">
              {primaryLinks.map(({ href, label }) => (
                <Link key={href} href={href} className={primaryNavLinkClass(pathname, href)}>
                  {label}
                </Link>
              ))}
              {user?.role === "tradesman"
                ? tradesmanNavLinks.map(({ href, label }) => (
                    <Link key={href} href={href} className={primaryNavLinkClass(pathname, href)}>
                      {label}
                    </Link>
                  ))
                : null}
              {user?.role === "admin"
                ? adminNavLinks.map(({ href, label }) => (
                    <Link key={href} href={href} className={primaryNavLinkClass(pathname, href)}>
                      {label}
                    </Link>
                  ))
                : null}
            </nav>
          </div>
          <AuthNav user={user} setUser={setUser} />
        </div>
      </div>
    </header>
  );
}
