"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { apiFetch } from "@/lib/api";

export type MeUser = {
  id: string;
  email: string;
  role: string;
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

  if (user === undefined) {
    return (
      <span className="text-xs text-neutral-400" aria-hidden>
        …
      </span>
    );
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-xs text-neutral-500 sm:inline" title={user.email}>
          {user.role === "tradesman" ? "Tradesman" : "Customer"}
        </span>
        <Link
          href="/dashboard"
          className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            pathname === "/dashboard"
              ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
          }`}
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          pathname === "/login"
            ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        }`}
      >
        Log in
      </Link>
      <Link
        href="/register"
        className="rounded-md bg-neutral-900 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        Register
      </Link>
    </div>
  );
}
