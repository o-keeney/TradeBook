"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { apiFetch } from "@/lib/api";

export type MeUser = {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
};

export type AuthNavProps = {
  user: MeUser | null | undefined;
  setUser: Dispatch<SetStateAction<MeUser | null | undefined>>;
};

export function AuthNav({ user, setUser }: AuthNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Still clear local UI if the API is unreachable
    }
    setUser(null);
    router.push("/");
    router.refresh();
  };

  if (user) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="hidden max-w-[10rem] truncate text-xs text-[var(--muted)] sm:inline" title={user.email}>
          {[user.firstName, user.lastName]
            .map((s) => s?.trim())
            .filter((s): s is string => Boolean(s && s.length > 0))
            .join(" ") || (user.role === "tradesman" ? "Tradesman" : "Customer")}
        </span>
        <Link
          href="/dashboard"
          className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            pathname === "/dashboard"
              ? "bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-fg)]"
              : "text-[var(--muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-fg)]"
          }`}
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-fg)]"
        >
          Log out
        </button>
      </div>
    );
  }

  const sessionPending = user === undefined;

  return (
    <div
      className={`flex shrink-0 items-center gap-2 ${sessionPending ? "opacity-70" : ""}`}
      aria-busy={sessionPending}
    >
      <Link
        href="/login"
        className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          pathname === "/login"
            ? "bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-fg)]"
            : "text-[var(--muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-fg)]"
        }`}
      >
        Log in
      </Link>
      <Link href="/register" className="tb-btn-primary-sm">
        Register
      </Link>
    </div>
  );
}
