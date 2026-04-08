"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type MeUser = {
  id: string;
  email: string;
  role: string;
};

export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
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
