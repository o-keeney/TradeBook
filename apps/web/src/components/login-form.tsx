"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type LoginFormProps = {
  /** Relative path after sign-in (must start with `/`, same-origin only). */
  nextPath?: string;
};

export function LoginForm({ nextPath = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetBanner, setResetBanner] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "1") {
      setResetBanner(true);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Could not sign in");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError(
        "Could not reach the sign-in service. If you are running locally, start the API and use the same host for the site and NEXT_PUBLIC_API_URL (for example both localhost, not 127.0.0.1 mixed with localhost).",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form method="post" onSubmit={(e) => void onSubmit(e)} className="max-w-md space-y-4">
      {resetBanner ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
          role="status"
        >
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-right text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Forgot password?
        </Link>
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
