"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type MeUser = {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await apiFetch("/api/users/me");
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }
      if (!res.ok) {
        setError("Could not load your account.");
        return;
      }
      const data = (await res.json()) as { user: MeUser };
      if (!cancelled) setUser(data.user);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <PageShell title="Dashboard" description="">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Dashboard" description="">
        <p className="text-neutral-500">Loading…</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Dashboard"
      description="Your account overview. Use the links below to open development tools while the product UI is still growing."
    >
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-neutral-500">Email</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">{user.email}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Role</dt>
            <dd className="font-medium capitalize text-neutral-900 dark:text-neutral-100">
              {user.role}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Email verified</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-100">
              {user.emailVerified ? "Yes" : "No — verification coming soon"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">User id</dt>
            <dd className="break-all font-mono text-xs text-neutral-700 dark:text-neutral-300">
              {user.id}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Quick links
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/find-tradesmen" className="text-neutral-700 underline dark:text-neutral-300">
              Find tradesmen →
            </Link>
          </li>
          {user.role === "tradesman" ? (
            <>
              <li>
                <Link href="/dev/portfolio" className="text-neutral-700 underline dark:text-neutral-300">
                  Portfolio tools →
                </Link>
              </li>
              <li>
                <Link href="/dev/work-orders" className="text-neutral-700 underline dark:text-neutral-300">
                  Work orders & jobs →
                </Link>
              </li>
            </>
          ) : (
            <li>
              <Link href="/dev/work-orders" className="text-neutral-700 underline dark:text-neutral-300">
                Work orders (customer) →
              </Link>
            </li>
          )}
        </ul>
      </div>
    </PageShell>
  );
}
