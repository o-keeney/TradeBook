"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type WorkOrderRow = {
  id: string;
  customerId: string;
  assignedTradesmanId: string | null;
  tradeCategory: string;
  title: string;
  description: string;
  submissionType: "direct" | "open_bid";
  status: string;
  locationAddress: string;
  locationPostcode: string;
  dueDate: string | number | Date | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

function formatDate(v: unknown): string {
  if (v == null) return "";
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function submissionLabel(t: WorkOrderRow["submissionType"]): string {
  return t === "open_bid" ? "Open bid" : "Direct";
}

function statusPillClass(status: string): string {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "cancelled":
    case "declined":
    case "customer_rejected":
      return "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
    case "open_bidding":
    case "quotes_submitted":
      return "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100";
    case "accepted":
    case "in_progress":
    case "awaiting_info":
      return "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200";
  }
}

function humanStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function WorkOrdersHub() {
  const router = useRouter();
  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, listRes] = await Promise.all([
        apiFetch("/api/users/me"),
        apiFetch("/api/work-orders"),
      ]);
      if (meRes.status === 401) {
        router.replace("/login?next=/work-orders");
        return;
      }
      if (meRes.ok) {
        const me = (await meRes.json()) as { user?: { role?: string } };
        setRole(me.user?.role ?? null);
      }
      if (listRes.status === 401) {
        router.replace("/login?next=/work-orders");
        return;
      }
      if (listRes.status === 403) {
        const j = (await listRes.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string };
        };
        if (j.error?.code === "email_not_verified") {
          setError(
            "Verify your email to view work orders. You can resend the link from your dashboard.",
          );
        } else {
          setError(j.error?.message ?? "You do not have access.");
        }
        setItems([]);
        return;
      }
      if (!listRes.ok) {
        setError("Could not load work orders.");
        setItems([]);
        return;
      }
      const data = (await listRes.json()) as { workOrders?: WorkOrderRow[] };
      setItems(data.workOrders ?? []);
    } catch {
      setError("Network error.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Loading work orders…
      </p>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        role="alert"
      >
        <p>{error}</p>
        {error.includes("Verify your email") ? (
          <p className="mt-2">
            <Link
              href="/dashboard"
              className="font-medium text-amber-900 underline dark:text-amber-200"
            >
              Open dashboard →
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">No work orders yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
          {role === "customer"
            ? "When you post a job, it will show up here."
            : role === "tradesman"
              ? "Open bidding jobs and work assigned to you will appear here."
              : "Sign in as a customer or tradesman to see jobs."}
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((wo) => (
        <li key={wo.id}>
          <Link
            href={`/work-orders/${wo.id}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
          >
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${statusPillClass(wo.status)}`}
                >
                  {humanStatus(wo.status)}
                </span>
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[0.65rem] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                  {submissionLabel(wo.submissionType)}
                </span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {wo.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                {wo.description}
              </p>
              <p className="mt-3 text-xs font-medium capitalize text-neutral-500 dark:text-neutral-400">
                {wo.tradeCategory.replace(/-/g, " ")}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-500">
                {wo.locationAddress}
                {wo.locationPostcode ? ` · ${wo.locationPostcode}` : ""}
              </p>
              <p className="mt-auto pt-4 text-xs text-neutral-400 dark:text-neutral-500">
                Updated {formatDate(wo.updatedAt)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
