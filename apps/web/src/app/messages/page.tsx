"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type ConversationRow = {
  id: string;
  workOrderId: string;
  workOrderTitle: string;
  updatedAt: number;
  unreadCount: number;
  lastMessagePreview: {
    authorId: string;
    body: string;
    createdAt: number;
  } | null;
};

export default function MessagesInboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/conversations");
      if (res.status === 401) {
        router.replace("/login?next=/messages");
        return;
      }
      if (!res.ok) {
        setItems([]);
        setError("Could not load conversations.");
        return;
      }
      const j = (await res.json()) as { conversations?: ConversationRow[] };
      setItems(j.conversations ?? []);
    } catch {
      setItems([]);
      setError("Network error.");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell title="Messages" description="One thread per job you share with the assigned tradesperson.">
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {items === null ? (
        <p className="mt-4 text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          No job threads yet. Open a work order where you are the customer or the assigned tradesperson to start
          messaging.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${encodeURIComponent(c.id)}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{c.workOrderTitle}</span>
                  {c.unreadCount > 0 ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-100">
                      {c.unreadCount} new
                    </span>
                  ) : null}
                </div>
                {c.lastMessagePreview ? (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {c.lastMessagePreview.body}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-neutral-500">No messages yet.</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
