"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { WorkOrderRow } from "@/components/work-orders-hub";

type JobUpdateRow = {
  id: string;
  workOrderId: string;
  authorId: string;
  updateType: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: string | number | Date;
};

function formatDateTime(v: unknown): string {
  if (v == null) return "";
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function statusBannerClass(status: string): string {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100";
    case "cancelled":
    case "declined":
      return "border-neutral-300 bg-neutral-100 text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-200";
    case "open_bidding":
      return "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100";
    default:
      return "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100";
  }
}

export function WorkOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [workOrder, setWorkOrder] = useState<WorkOrderRow | null>(null);
  const [updates, setUpdates] = useState<JobUpdateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [woRes, tlRes] = await Promise.all([
        apiFetch(`/api/work-orders/${id}`),
        apiFetch(`/api/work-orders/${id}/timeline`),
      ]);
      if (woRes.status === 401) {
        router.replace(`/login?next=/work-orders/${encodeURIComponent(id)}`);
        return;
      }
      if (woRes.status === 404 || woRes.status === 403) {
        setError("This job was not found or you do not have access.");
        setWorkOrder(null);
        setUpdates([]);
        return;
      }
      if (!woRes.ok) {
        setError("Could not load this work order.");
        setWorkOrder(null);
        setUpdates([]);
        return;
      }
      const woData = (await woRes.json()) as { workOrder?: WorkOrderRow };
      setWorkOrder(woData.workOrder ?? null);

      if (tlRes.ok) {
        const tl = (await tlRes.json()) as { updates?: JobUpdateRow[] };
        setUpdates(tl.updates ?? []);
      } else {
        setUpdates([]);
      }
    } catch {
      setError("Network error.");
      setWorkOrder(null);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-neutral-500">Invalid link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-neutral-500">
        Loading job…
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/work-orders"
          className="text-sm font-medium text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← All work orders
        </Link>
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error ?? "Not found."}
        </p>
      </div>
    );
  }

  const wo = workOrder;

  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-8">
      <nav className="mb-6">
        <Link
          href="/work-orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <span aria-hidden>←</span> All work orders
        </Link>
      </nav>

      <header
        className={`mb-8 rounded-2xl border px-5 py-4 sm:px-6 sm:py-5 ${statusBannerClass(wo.status)}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Status</p>
        <p className="mt-1 text-xl font-bold capitalize tracking-tight sm:text-2xl">
          {humanStatus(wo.status)}
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
          {wo.title}
        </h1>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs">
          <li className="rounded-full border border-neutral-200/80 bg-white/60 px-3 py-1 font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-200">
            {wo.tradeCategory.replace(/-/g, " ")}
          </li>
          <li className="rounded-full border border-neutral-200/80 bg-white/60 px-3 py-1 font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-200">
            {wo.submissionType === "open_bid" ? "Open bid" : "Direct job"}
          </li>
          <li className="rounded-full border border-neutral-200/80 bg-white/60 px-3 py-1 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-400">
            Updated {formatDateTime(wo.updatedAt)}
          </li>
        </ul>
      </header>

      <section className="mb-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Location
        </h2>
        <p className="mt-2 text-neutral-800 dark:text-neutral-200">{wo.locationAddress}</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{wo.locationPostcode}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Description</h2>
        <div className="mt-4 max-w-none text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
          {wo.description.split("\n").map((para, i) => (
            <p key={i} className={i > 0 ? "mt-4" : ""}>
              {para}
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="timeline-heading" className="border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <h2 id="timeline-heading" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Timeline
        </h2>
        {updates.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No updates on this job yet.</p>
        ) : (
          <ol className="mt-6 space-y-4">
            {updates.map((u) => (
              <li
                key={u.id}
                className="relative rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {u.updateType.replace(/_/g, " ")}
                  </span>
                  <time className="text-xs text-neutral-400 dark:text-neutral-500" dateTime={String(u.createdAt)}>
                    {formatDateTime(u.createdAt)}
                  </time>
                </div>
                {u.content?.trim() ? (
                  <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{u.content}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
