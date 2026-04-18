"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        message?: string;
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Check that the API is running.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
          If an account exists for that email, we sent a link to reset your password. Check your inbox
          (and spam). The link expires in one hour.
        </p>
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          <Link href="/login" className="font-medium text-neutral-900 underline dark:text-neutral-100">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-md space-y-4">
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
