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
  { href: "/messages", label: "Messages", whenSignedIn: true as const },
  { href: "/notifications", label: "Notifications", whenSignedIn: true as const },
] as const;

const tradesmanNavLinks = [
  { href: "/profile", label: "Profile" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/work-orders", label: "Work orders" },
] as const;

const customerNavLinks = [{ href: "/work-orders", label: "Work orders" }] as const;

/** Admin only: use `/admin` then the in-page subnav (Overview · Users); avoid a top-level "Users" link. */
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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
      const nRes = await apiFetch("/api/notifications/unread-count");
      if (nRes.ok) {
        const n = (await nRes.json()) as { unreadCount?: number };
        setUnreadNotifications(Math.max(0, n.unreadCount ?? 0));
      } else {
        setUnreadNotifications(0);
      }
    } catch {
      setUser(null);
      setUnreadNotifications(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  return (
    <header className="sticky top-0 z-50 bg-[var(--background)]/70 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/80 px-3 py-2 shadow-[0_10px_35px_rgb(15_23_42_/0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center">
            <nav className="flex flex-wrap gap-x-1 gap-y-2 rounded-xl bg-[var(--background)]/55 p-1 text-sm" aria-label="Primary">
              {primaryLinks.map((item) => {
                if ("whenSignedIn" in item && item.whenSignedIn && !user) return null;
                const { href, label } = item;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={primaryNavLinkClass(pathname, href)}
                    aria-current={linkActive(pathname, href) ? "page" : undefined}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {label}
                      {href === "/notifications" && unreadNotifications > 0 ? (
                        <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {unreadNotifications > 99 ? "99+" : unreadNotifications}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
              {user?.role === "tradesman"
                ? tradesmanNavLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={primaryNavLinkClass(pathname, href)}
                      aria-current={linkActive(pathname, href) ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  ))
                : null}
              {user?.role === "customer"
                ? customerNavLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={primaryNavLinkClass(pathname, href)}
                      aria-current={linkActive(pathname, href) ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  ))
                : null}
              {user?.role === "admin"
                ? adminNavLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={primaryNavLinkClass(pathname, href)}
                      aria-current={linkActive(pathname, href) ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  ))
                : null}
            </nav>
          </div>
          <div className="flex shrink-0 items-center justify-end sm:ml-auto">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)]/70 bg-[var(--background)]/60 p-1.5">
              <ThemeToggle />
              <span aria-hidden className="hidden h-6 w-px bg-[var(--border)]/80 sm:block" />
              <AuthNav user={user} setUser={setUser} />
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="h-3 w-full bg-gradient-to-b from-[var(--border)]/30 via-[var(--border)]/10 to-transparent"
      />
    </header>
  );
}
