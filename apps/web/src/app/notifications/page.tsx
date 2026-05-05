"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: number | null;
  createdAt: number;
};

function formatWhen(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/notifications");
      if (res.status === 401) {
        router.replace("/login?next=/notifications");
        return;
      }
      if (!res.ok) {
        setItems([]);
        setError("Could not load notifications.");
        return;
      }
      const j = (await res.json()) as { notifications?: NotificationRow[] };
      setItems(j.notifications ?? []);
    } catch {
      setItems([]);
      setError("Network error.");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
    await load();
  };

  const markAllRead = async () => {
    if (busyAll) return;
    setBusyAll(true);
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      await load();
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <PageShell title="Notifications" description="Updates about messages and work-order activity.">
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={busyAll || !items || items.length === 0}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {busyAll ? "Marking…" : "Mark all as read"}
        </button>
      </div>

      {items === null ? (
        <p className="mt-4 text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No notifications yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 shadow-sm ${
                n.readAt
                  ? "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
                  : "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/70 dark:bg-indigo-950/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{formatWhen(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.href ? (
                    <Link
                      href={n.href}
                      className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      Open
                    </Link>
                  ) : null}
                  {n.readAt ? null : (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
