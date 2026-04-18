"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthNav, type MeUser } from "@/components/auth-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiFetch } from "@/lib/api";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/find-tradesmen", label: "Find tradesmen" },
  { href: "/contact", label: "Contact" },
] as const;

const tradesmanNavLinks = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/work-orders", label: "Work orders" },
] as const;

const adminNavLinks = [{ href: "/admin", label: "Admin" }] as const;

function linkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function primaryNavLinkClass(pathname: string, href: string): string {
  return `rounded-md px-2.5 py-1.5 transition-colors ${
    linkActive(pathname, href)
      ? "bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-fg)]"
      : "text-[var(--muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-fg)]"
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
    <header className="sticky top-0 z-50 border-b border-[var(--border)]/90 bg-[var(--background)]/95 backdrop-blur dark:border-[var(--border)]/90">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
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
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 sm:ml-auto">
            <ThemeToggle />
            <AuthNav user={user} setUser={setUser} />
          </div>
        </div>
      </div>
    </header>
  );
}
