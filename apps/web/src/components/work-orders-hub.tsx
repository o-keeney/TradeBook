"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { OpenBidWorkOrderForm } from "@/components/open-bid-work-order-form";
import {
  humanWorkOrderStatus,
  workOrderListCardAccentClass,
  workOrderStatusPillClass,
} from "@/lib/work-order-status-track";

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
  budgetText?: string | null;
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

export function WorkOrdersHub() {
  const router = useRouter();
  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [tradesmanView, setTradesmanView] = useState<"my_work_orders" | "open_work_orders">(
    "my_work_orders",
  );
  const [customerView, setCustomerView] = useState<"my_work_orders" | "create_new">(
    "my_work_orders",
  );
  const [openSearch, setOpenSearch] = useState("");
  const [openTradeFilter, setOpenTradeFilter] = useState<string>("all");

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
        const meJson = (await meRes.json()) as { user?: { id?: string; role?: string } };
        const user = meJson.user;
        setMe(user?.id && user?.role ? { id: user.id, role: user.role } : null);
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

  const role = me?.role ?? null;

  const isTradesman = role === "tradesman" && Boolean(me?.id);
  const isCustomer = role === "customer" && Boolean(me?.id);
  const openBidItems = isTradesman
    ? items.filter(
        (wo) =>
          wo.submissionType === "open_bid" &&
          (wo.status === "open_bidding" || wo.status === "quotes_submitted") &&
          wo.assignedTradesmanId == null,
      )
    : [];
  const myWorkOrderItems = isTradesman
    ? items.filter(
        (wo) =>
          wo.assignedTradesmanId === me!.id ||
          (wo.submissionType === "direct" && wo.assignedTradesmanId != null && wo.assignedTradesmanId === me!.id),
      )
    : items;
  const openSearchNorm = openSearch.trim().toLowerCase();
  const openTradeOptions = [...new Set(openBidItems.map((wo) => wo.tradeCategory).filter(Boolean))].sort();
  const filteredOpenBidItems = openBidItems.filter((wo) => {
    if (openTradeFilter !== "all" && wo.tradeCategory !== openTradeFilter) return false;
    if (!openSearchNorm) return true;
    const hay = [
      wo.locationAddress,
      wo.locationPostcode,
      wo.title,
      wo.description,
      wo.tradeCategory,
      wo.budgetText ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(openSearchNorm);
  });
  const customerMyWorkOrderItems = isCustomer ? items.filter((wo) => wo.customerId === me!.id) : [];
  const visibleItems = isTradesman
    ? tradesmanView === "open_work_orders"
      ? filteredOpenBidItems
      : myWorkOrderItems
    : isCustomer
      ? customerView === "my_work_orders"
        ? customerMyWorkOrderItems
        : []
      : items;

  return (
    <>
      {isTradesman ? (
        <div className="mb-5 space-y-3">
          <nav
            aria-label="Work order sections"
            className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <div className="flex min-w-max items-stretch">
              <button
                type="button"
                onClick={() => setTradesmanView("open_work_orders")}
                className={`relative px-4 py-3 text-sm font-medium transition ${
                  tradesmanView === "open_work_orders"
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-200"
                }`}
              >
                Open work orders
                <span className="ml-2 rounded-full border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-700">
                  {openBidItems.length}
                </span>
                {tradesmanView === "open_work_orders" ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setTradesmanView("my_work_orders")}
                className={`relative px-4 py-3 text-sm font-medium transition ${
                  tradesmanView === "my_work_orders"
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-200"
                }`}
              >
                My work orders
                <span className="ml-2 rounded-full border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-700">
                  {myWorkOrderItems.length}
                </span>
                {tradesmanView === "my_work_orders" ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                ) : null}
              </button>
            </div>
          </nav>

          {tradesmanView === "open_work_orders" ? (
            <div className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/40 sm:grid-cols-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Search area / keyword
                <input
                  value={openSearch}
                  onChange={(e) => setOpenSearch(e.target.value)}
                  placeholder="e.g. Letterkenny, F92, electrician"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Trade
                <select
                  value={openTradeFilter}
                  onChange={(e) => setOpenTradeFilter(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                >
                  <option value="all">All trades</option>
                  {openTradeOptions.map((trade) => (
                    <option key={trade} value={trade}>
                      {trade}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
      {isCustomer ? (
        <div className="mb-5">
          <nav
            aria-label="Work order sections"
            className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <div className="flex min-w-max items-stretch">
              <button
                type="button"
                onClick={() => setCustomerView("my_work_orders")}
                className={`relative px-4 py-3 text-sm font-medium transition ${
                  customerView === "my_work_orders"
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-200"
                }`}
              >
                My work orders
                <span className="ml-2 rounded-full border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-700">
                  {customerMyWorkOrderItems.length}
                </span>
                {customerView === "my_work_orders" ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setCustomerView("create_new")}
                className={`relative px-4 py-3 text-sm font-medium transition ${
                  customerView === "create_new"
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-200"
                }`}
              >
                Create new
                {customerView === "create_new" ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                ) : null}
              </button>
            </div>
          </nav>
        </div>
      ) : null}

      {isCustomer && customerView === "create_new" ? (
        <OpenBidWorkOrderForm />
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">No work orders yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
            {isTradesman
              ? tradesmanView === "open_work_orders"
                ? "No open bidding jobs are available right now."
                : "You do not have any work orders assigned or accepted yet."
              : isCustomer
                ? "You have not posted any work orders yet."
              : role === "customer"
                ? "When you post a job, it will show up here."
                : role === "tradesman"
                  ? "Open bidding jobs and work assigned to you will appear here."
                  : "Sign in as a customer or tradesman to see jobs."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((wo) => (
            <li key={wo.id}>
              <Link
                href={`/work-orders/${wo.id}`}
                className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600 ${workOrderListCardAccentClass(wo.status)}`}
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${workOrderStatusPillClass(wo.status)}`}
                    >
                      {humanWorkOrderStatus(wo.status)}
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
                  {wo.budgetText?.trim() ? (
                    <p className="mt-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Budget: {wo.budgetText.trim()}
                    </p>
                  ) : null}
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
      )}
    </>
  );
}
