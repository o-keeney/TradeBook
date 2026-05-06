"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { formatBudgetDisplay } from "@/lib/format-budget";
import { humanWorkOrderStatus, workOrderStatusBannerClass } from "@/lib/work-order-status-track";
import type { WorkOrderRow } from "@/components/work-orders-hub";
import { WorkOrderPlannerSection } from "@/components/work-order-planner";
import { postWorkOrderJobImage } from "@/lib/work-order-media";

type ForWorkOrderReviewJson = {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: number;
    tradesmanId: string;
  } | null;
  canReview: boolean;
  tradesmanId?: string | null;
};

type JobUpdateRow = {
  id: string;
  workOrderId: string;
  authorId: string;
  updateType: string;
  content: string | null;
  mediaUrls: string[];
  createdAt: string | number | Date;
};

type WorkOrderBidRow = {
  id: string;
  workOrderId: string;
  tradesmanId: string;
  estimatedCost: number | null;
  estimatedTimeline: string | null;
  notes: string | null;
  status: "submitted" | "rejected" | "accepted";
  createdAt: string | number | Date;
};

type WorkOrderExpenseRow = {
  id: string;
  workOrderId: string;
  providerId: string;
  itemLabel: string;
  notes: string | null;
  amount: number;
  incurredAt: string | number | Date;
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

function CustomerReviewPanel({
  workOrderId,
  info,
  onChanged,
}: {
  workOrderId: string;
  info: ForWorkOrderReviewJson;
  onChanged: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (info.review) {
    return (
      <section className="mb-10 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/25 sm:p-6">
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">Your review</h2>
        <p className="mt-2 text-sm text-emerald-900/90 dark:text-emerald-100/90">
          You rated this job <strong>{info.review.rating}</strong> out of 5
          {info.review.comment?.trim() ? (
            <>
              {" "}
              — <span className="italic">&ldquo;{info.review.comment.trim()}&rdquo;</span>
            </>
          ) : null}
          .
        </p>
        <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-200/70">
          Submitted {formatDateTime(info.review.createdAt)}
        </p>
      </section>
    );
  }

  if (!info.canReview) {
    return null;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId,
          rating,
          comment: comment.trim() ? comment.trim() : undefined,
        }),
      });
      const raw = await res.text();
      if (res.status === 403) {
        setErr("Verify your email before submitting a review.");
        return;
      }
      if (!res.ok) {
        let msg = "Could not submit review.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setErr(msg);
        return;
      }
      await onChanged();
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Rate the tradesman</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        This job is completed. Share a quick rating to help other customers.
      </p>
      {err ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}
      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Rating
          <select
            className="mt-1.5 w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            value={String(rating)}
            onChange={(e) => setRating(Number.parseInt(e.target.value, 10))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} — {n === 5 ? "Excellent" : n === 1 ? "Poor" : "OK"}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Comment (optional)
          <textarea
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went well?"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {saving ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </section>
  );
}

function canUploadJobPhotos(me: { id: string } | null, wo: WorkOrderRow): boolean {
  if (!me) return false;
  if (
    wo.customerId === me.id &&
    wo.submissionType === "direct" &&
    wo.status === "pending"
  ) {
    return true;
  }
  if (
    wo.customerId === me.id &&
    (wo.status === "open_bidding" || wo.status === "quotes_submitted")
  ) {
    return true;
  }
  if (
    wo.assignedTradesmanId === me.id &&
    ["accepted", "in_progress", "awaiting_info"].includes(wo.status)
  ) {
    return true;
  }
  return false;
}

function isLikelyImageMediaUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("/api/work-orders/media/")) return true;
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u);
}

function mediaUploaderMeta(
  wo: WorkOrderRow,
  authorId: string,
): { label: string; className: string } {
  if (authorId === wo.customerId) {
    return {
      label: "Customer upload",
      className:
        "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200",
    };
  }
  if (wo.assignedTradesmanId && authorId === wo.assignedTradesmanId) {
    return {
      label: "Provider upload",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
    };
  }
  return {
    label: "Photo upload",
    className:
      "border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
  };
}

export function WorkOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [workOrder, setWorkOrder] = useState<WorkOrderRow | null>(null);
  const [updates, setUpdates] = useState<JobUpdateRow[]>([]);
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [reviewInfo, setReviewInfo] = useState<ForWorkOrderReviewJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [respondBusy, setRespondBusy] = useState<null | "accept" | "decline">(null);
  const [respondErr, setRespondErr] = useState<string | null>(null);
  const [jobConversationId, setJobConversationId] = useState<string | null>(null);
  const [jobConvLoading, setJobConvLoading] = useState(false);
  const [jobConvErr, setJobConvErr] = useState<string | null>(null);
  const [jobConvUnreadCount, setJobConvUnreadCount] = useState(0);
  const [expandedImageSrc, setExpandedImageSrc] = useState<string | null>(null);
  const [bidEstimatedCost, setBidEstimatedCost] = useState("");
  const [bidEstimatedTimeline, setBidEstimatedTimeline] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [bidBusy, setBidBusy] = useState(false);
  const [bidMsg, setBidMsg] = useState<string | null>(null);
  const [customerBids, setCustomerBids] = useState<WorkOrderBidRow[]>([]);
  const [customerBidsOpen, setCustomerBidsOpen] = useState(true);
  const [customerBidsLoading, setCustomerBidsLoading] = useState(false);
  const [customerBidsErr, setCustomerBidsErr] = useState<string | null>(null);
  const [awardBusyBidId, setAwardBusyBidId] = useState<string | null>(null);
  const [rejectBidBusyId, setRejectBidBusyId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<WorkOrderExpenseRow[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesErr, setExpensesErr] = useState<string | null>(null);
  const [expenseItemLabel, setExpenseItemLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [expenseMsg, setExpenseMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [woRes, tlRes, meRes] = await Promise.all([
        apiFetch(`/api/work-orders/${id}`),
        apiFetch(`/api/work-orders/${id}/timeline`),
        apiFetch("/api/users/me"),
      ]);
      if (woRes.status === 401) {
        router.replace(`/login?next=/work-orders/${encodeURIComponent(id)}`);
        return;
      }
      if (woRes.status === 404 || woRes.status === 403) {
        setError("This job was not found or you do not have access.");
        setWorkOrder(null);
        setUpdates([]);
        setMe(null);
        setReviewInfo(null);
        return;
      }
      if (!woRes.ok) {
        setError("Could not load this work order.");
        setWorkOrder(null);
        setUpdates([]);
        setMe(null);
        setReviewInfo(null);
        return;
      }
      const woData = (await woRes.json()) as { workOrder?: WorkOrderRow };
      const woRow = woData.workOrder ?? null;
      setWorkOrder(woRow);

      let meUser: { id: string; role: string } | null = null;
      if (meRes.ok) {
        const mj = (await meRes.json()) as { user?: { id: string; role: string } };
        meUser = mj.user ?? null;
      }
      setMe(meUser);

      if (woRow && meUser?.role === "customer" && meUser.id === woRow.customerId) {
        const rr = await apiFetch(`/api/reviews/for-work-order/${encodeURIComponent(id)}`);
        setReviewInfo(rr.ok ? ((await rr.json()) as ForWorkOrderReviewJson) : null);
      } else {
        setReviewInfo(null);
      }

      if (woRow && meUser?.role === "customer" && meUser.id === woRow.customerId && woRow.submissionType === "open_bid") {
        setCustomerBidsLoading(true);
        setCustomerBidsErr(null);
        const bidsRes = await apiFetch(`/api/work-orders/${encodeURIComponent(id)}/bids`);
        if (bidsRes.ok) {
          const bj = (await bidsRes.json()) as { bids?: WorkOrderBidRow[] };
          setCustomerBids(bj.bids ?? []);
        } else {
          setCustomerBids([]);
          setCustomerBidsErr("Could not load quotes.");
        }
        setCustomerBidsLoading(false);
      } else {
        setCustomerBids([]);
        setCustomerBidsErr(null);
        setCustomerBidsLoading(false);
      }

      if (tlRes.ok) {
        const tl = (await tlRes.json()) as { updates?: JobUpdateRow[] };
        setUpdates(tl.updates ?? []);
      } else {
        setUpdates([]);
      }

      if (
        woRow &&
        meUser &&
        (meUser.id === woRow.customerId || meUser.id === woRow.assignedTradesmanId)
      ) {
        setExpensesLoading(true);
        setExpensesErr(null);
        const expensesRes = await apiFetch(`/api/work-orders/${encodeURIComponent(id)}/expenses`);
        if (expensesRes.ok) {
          const ej = (await expensesRes.json()) as {
            items?: WorkOrderExpenseRow[];
            totalAmount?: number;
          };
          setExpenses(ej.items ?? []);
          setExpenseTotal(Number(ej.totalAmount ?? 0));
        } else {
          setExpenses([]);
          setExpenseTotal(0);
          setExpensesErr("Could not load expense tracker.");
        }
        setExpensesLoading(false);
      } else {
        setExpenses([]);
        setExpenseTotal(0);
        setExpensesErr(null);
        setExpensesLoading(false);
      }
    } catch {
      setError("Network error.");
      setWorkOrder(null);
      setUpdates([]);
      setMe(null);
      setReviewInfo(null);
      setExpenses([]);
      setExpenseTotal(0);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const woRow = workOrder;
    if (!id || !woRow || !me || !woRow.assignedTradesmanId) {
      setJobConversationId(null);
      setJobConvLoading(false);
      setJobConvErr(null);
      return;
    }
    const eligible = me.id === woRow.customerId || me.id === woRow.assignedTradesmanId;
    if (!eligible) {
      setJobConversationId(null);
      setJobConvLoading(false);
      setJobConvErr(null);
      return;
    }
    let cancelled = false;
    setJobConvLoading(true);
    setJobConvErr(null);
    void (async () => {
      try {
        const res = await apiFetch(`/api/conversations/by-work-order/${encodeURIComponent(id)}`);
        if (cancelled) return;
        if (!res.ok) {
          setJobConversationId(null);
          setJobConvErr(
            res.status === 404
              ? "Messaging is not available for this job."
              : "Could not load the message thread.",
          );
          return;
        }
        const j = (await res.json()) as { conversation?: { id: string } };
        if (cancelled) return;
        const cid = j.conversation?.id ?? null;
        setJobConversationId(cid);
        if (!cid) {
          setJobConvErr("Could not open the message thread.");
        }
      } catch {
        if (!cancelled) {
          setJobConversationId(null);
          setJobConvErr("Network error.");
        }
      } finally {
        if (!cancelled) setJobConvLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, workOrder, me]);

  useEffect(() => {
    const woRow = workOrder;
    const canShowMessages =
      me != null &&
      woRow != null &&
      Boolean(woRow.assignedTradesmanId) &&
      (me.id === woRow.customerId || me.id === woRow.assignedTradesmanId);
    if (!jobConversationId || !canShowMessages) {
      setJobConvUnreadCount(0);
      return;
    }
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const res = await apiFetch("/api/conversations");
        if (!res.ok) {
          if (!cancelled) setJobConvUnreadCount(0);
          return;
        }
        const j = (await res.json()) as { conversations?: Array<{ id: string; unreadCount?: number }> };
        if (cancelled) return;
        const conv = (j.conversations ?? []).find((c) => c.id === jobConversationId);
        setJobConvUnreadCount(Math.max(0, conv?.unreadCount ?? 0));
      } catch {
        if (!cancelled) setJobConvUnreadCount(0);
      }
    };
    void loadUnread();
    const timer = window.setInterval(() => {
      void loadUnread();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobConversationId, me, workOrder]);

  useEffect(() => {
    if (!expandedImageSrc) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setExpandedImageSrc(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedImageSrc]);

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

  const showRejectQuotes =
    me?.role === "customer" &&
    me.id === wo.customerId &&
    wo.submissionType === "open_bid" &&
    (wo.status === "open_bidding" || wo.status === "quotes_submitted");

  const showJobMessagesCta =
    me != null &&
    Boolean(wo.assignedTradesmanId) &&
    (me.id === wo.customerId || me.id === wo.assignedTradesmanId);

  const canRespondToDirectJob =
    me?.role === "tradesman" &&
    me.id === wo.assignedTradesmanId &&
    wo.submissionType === "direct" &&
    wo.status === "pending";
  const canSubmitOpenBid =
    me?.role === "tradesman" &&
    wo.submissionType === "open_bid" &&
    (wo.status === "open_bidding" || wo.status === "quotes_submitted") &&
    me.id !== wo.customerId;
  const showCustomerQuotesMenu =
    me?.role === "customer" &&
    me.id === wo.customerId &&
    wo.submissionType === "open_bid";
  const pendingQuotesCount = customerBids.filter((b) => b.status === "submitted").length;
  const hasPendingQuotes = pendingQuotesCount > 0;
  const isAssignedProvider = me?.role === "tradesman" && me.id === wo.assignedTradesmanId;
  const canTrackExpenses = isAssignedProvider && ["accepted", "in_progress", "awaiting_info"].includes(wo.status);
  const canViewExpenses =
    me != null && (me.id === wo.customerId || me.id === wo.assignedTradesmanId);

  const rejectOpenQuotes = async () => {
    if (!showRejectQuotes || rejectBusy) return;
    if (
      !window.confirm(
        "Reject all submitted quotes and close this job to new bids? This cannot be undone from here.",
      )
    ) {
      return;
    }
    setRejectBusy(true);
    try {
      const res = await apiFetch(`/api/work-orders/${wo.id}/reject-bidding`, { method: "POST" });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Could not update the job.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        alert(msg);
        return;
      }
      await load();
    } catch {
      alert("Network error.");
    } finally {
      setRejectBusy(false);
    }
  };

  const respondToDirectJob = async (action: "accept" | "decline") => {
    if (!canRespondToDirectJob || respondBusy) return;
    setRespondBusy(action);
    setRespondErr(null);
    try {
      const res = await apiFetch(`/api/work-orders/${wo.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Could not update the job response.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setRespondErr(msg);
        return;
      }
      await load();
    } catch {
      setRespondErr("Network error.");
    } finally {
      setRespondBusy(null);
    }
  };
  const submitOpenBid = async () => {
    if (!canSubmitOpenBid || bidBusy) return;
    setBidBusy(true);
    setBidMsg(null);
    try {
      const costTrim = bidEstimatedCost.trim();
      let estimatedCost: number | null | undefined = undefined;
      if (costTrim.length > 0) {
        const n = Number.parseFloat(costTrim.replace(",", "."));
        if (!Number.isFinite(n) || n < 0) {
          setBidMsg("Enter a valid non-negative amount.");
          setBidBusy(false);
          return;
        }
        estimatedCost = n;
      }
      const res = await apiFetch(`/api/work-orders/${wo.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedCost,
          estimatedTimeline: bidEstimatedTimeline.trim() || undefined,
          notes: bidNotes.trim() || undefined,
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = "Could not submit bid.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setBidMsg(msg);
        return;
      }
      setBidMsg("Bid submitted.");
      setBidEstimatedCost("");
      setBidEstimatedTimeline("");
      setBidNotes("");
      await load();
    } catch {
      setBidMsg("Network error.");
    } finally {
      setBidBusy(false);
    }
  };

  const awardBid = async (bidId: string) => {
    if (!showCustomerQuotesMenu || awardBusyBidId) return;
    setAwardBusyBidId(bidId);
    setCustomerBidsErr(null);
    try {
      const res = await apiFetch(`/api/work-orders/${wo.id}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Could not accept quote.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setCustomerBidsErr(msg);
        return;
      }
      await load();
    } catch {
      setCustomerBidsErr("Network error.");
    } finally {
      setAwardBusyBidId(null);
    }
  };

  const rejectBid = async (bidId: string) => {
    if (!showCustomerQuotesMenu || rejectBidBusyId) return;
    if (!window.confirm("Reject this quote? The provider can submit a new quote while bidding remains open.")) {
      return;
    }
    setRejectBidBusyId(bidId);
    setCustomerBidsErr(null);
    try {
      const res = await apiFetch(`/api/work-orders/${wo.id}/reject-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Could not reject quote.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setCustomerBidsErr(msg);
        return;
      }
      await load();
    } catch {
      setCustomerBidsErr("Network error.");
    } finally {
      setRejectBidBusyId(null);
    }
  };

  const onPickJobPhoto = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file || photoBusy) return;
    setPhotoBusy(true);
    setPhotoErr(null);
    try {
      const up = await postWorkOrderJobImage(wo.id, file);
      if (!up.ok) {
        setPhotoErr(up.message);
        return;
      }
      const res = await apiFetch(`/api/work-orders/${wo.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: "media_upload",
          content: "",
          mediaUrls: [up.url],
        }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Photo uploaded but could not add a timeline entry.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setPhotoErr(msg);
        return;
      }
      await load();
    } catch {
      setPhotoErr("Network error.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const submitExpense = async () => {
    if (!canTrackExpenses || expenseBusy) return;
    const itemLabel = expenseItemLabel.trim();
    const amountRaw = expenseAmount.trim();
    if (!itemLabel) {
      setExpenseMsg("Enter an item name.");
      return;
    }
    const amountNum = Number.parseFloat(amountRaw.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setExpenseMsg("Enter a valid amount greater than zero.");
      return;
    }

    setExpenseBusy(true);
    setExpenseMsg(null);
    try {
      const res = await apiFetch(`/api/work-orders/${wo.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemLabel,
          amount: amountNum,
          notes: expenseNotes.trim() || undefined,
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = "Could not add expense.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setExpenseMsg(msg);
        return;
      }
      setExpenseItemLabel("");
      setExpenseAmount("");
      setExpenseNotes("");
      setExpenseMsg("Expense added.");
      await load();
    } catch {
      setExpenseMsg("Network error.");
    } finally {
      setExpenseBusy(false);
    }
  };

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
        className={`mb-8 rounded-2xl border px-5 py-4 sm:px-6 sm:py-5 ${workOrderStatusBannerClass(wo.status)}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Status</p>
        <p className="mt-1 text-xl font-bold capitalize tracking-tight sm:text-2xl">
          {humanWorkOrderStatus(wo.status)}
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
        {showRejectQuotes ? (
          <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
            <button
              type="button"
              disabled={rejectBusy}
              onClick={() => void rejectOpenQuotes()}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              {rejectBusy ? "Updating…" : "Reject quotes and close job"}
            </button>
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              Closes bidding without awarding anyone. Tradespeople who quoted will see the job as closed.
            </p>
          </div>
        ) : null}
        {canRespondToDirectJob ? (
          <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              This direct job request is waiting for your response.
            </p>
            {respondErr ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {respondErr}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={respondBusy !== null}
                onClick={() => void respondToDirectJob("accept")}
                className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {respondBusy === "accept" ? "Accepting…" : "Accept job"}
              </button>
              <button
                type="button"
                disabled={respondBusy !== null}
                onClick={() => void respondToDirectJob("decline")}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                {respondBusy === "decline" ? "Declining…" : "Decline job"}
              </button>
            </div>
          </div>
        ) : null}
        {canSubmitOpenBid ? (
          <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Submit your bid for this open job
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Estimated cost (optional)
                <input
                  value={bidEstimatedCost}
                  onChange={(e) => setBidEstimatedCost(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 1500"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Timeline (optional)
                <input
                  value={bidEstimatedTimeline}
                  onChange={(e) => setBidEstimatedTimeline(e.target.value)}
                  placeholder="e.g. 2-3 days"
                  maxLength={500}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
                Notes (optional)
                <textarea
                  value={bidNotes}
                  onChange={(e) => setBidNotes(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="Add exclusions, assumptions, and availability."
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                disabled={bidBusy}
                onClick={() => void submitOpenBid()}
                className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {bidBusy ? "Submitting…" : "Submit bid"}
              </button>
              {showJobMessagesCta && jobConversationId ? (
                <Link
                  href={`/messages/${encodeURIComponent(jobConversationId)}`}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                  Message customer
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-500 opacity-80 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                  title="Messaging becomes available after a provider is assigned"
                >
                  Message customer
                </button>
              )}
              {bidMsg ? (
                <p
                  className={`text-sm ${bidMsg === "Bid submitted." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  role={bidMsg === "Bid submitted." ? "status" : "alert"}
                >
                  {bidMsg}
                </p>
              ) : null}
            </div>
            {!showJobMessagesCta ? (
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                Messaging is available once a provider is assigned to the job.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-75">Location</dt>
              <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">{wo.locationAddress}</dd>
              <dd className="mt-0.5 text-neutral-600 dark:text-neutral-300">{wo.locationPostcode}</dd>
            </div>
            {wo.budgetText?.trim() ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide opacity-75">Budget</dt>
                <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                  {formatBudgetDisplay(wo.budgetText.trim())}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      <section className="mb-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Description</h2>
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 max-w-none text-base leading-relaxed text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300">
          {wo.description.split("\n").map((para, i) => (
            <p key={i} className={i > 0 ? "mt-4" : ""}>
              {para}
            </p>
          ))}
        </div>
      </section>

      {showCustomerQuotesMenu ? (
        <section
          className={`mb-10 rounded-2xl p-5 sm:p-6 ${
            hasPendingQuotes
              ? "border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white shadow-[0_10px_30px_-12px_rgba(217,119,6,0.45)] dark:border-amber-600/50 dark:from-amber-950/30 dark:via-neutral-950 dark:to-neutral-950"
              : "border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
          }`}
        >
          <button
            type="button"
            onClick={() => setCustomerBidsOpen((v) => !v)}
            className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${
              hasPendingQuotes
                ? "border border-amber-300/70 bg-white/90 shadow-sm hover:border-amber-400 hover:shadow dark:border-amber-600/40 dark:bg-neutral-900/80 dark:hover:border-amber-500"
                : "border border-neutral-200 bg-white shadow-sm hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600"
            }`}
            aria-expanded={customerBidsOpen}
          >
            <span className="flex items-center gap-3">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                  hasPendingQuotes
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10" />
                </svg>
              </span>
              <span>
                <span className="block text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Quotes received
                </span>
                <span className="block text-xs text-neutral-600 dark:text-neutral-400">
                  Review and accept provider quotes quickly
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                  hasPendingQuotes
                    ? "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950"
                    : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100"
                }`}
              >
                {customerBids.length}
              </span>
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {customerBidsOpen ? "Hide" : "Show"}
              </span>
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 text-neutral-500 transition-transform duration-200 dark:text-neutral-400 ${customerBidsOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>

          {customerBidsOpen ? (
            <div
              className={`mt-4 rounded-xl p-4 ${
                hasPendingQuotes
                  ? "border border-amber-200/70 bg-white/90 dark:border-amber-600/30 dark:bg-neutral-950/70"
                  : "border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950"
              }`}
            >
              {customerBidsErr ? (
                <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                  {customerBidsErr}
                </p>
              ) : null}
              {customerBidsLoading ? (
                <p className="text-sm text-neutral-500">Loading quotes…</p>
              ) : customerBids.length === 0 ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  No quotes submitted yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {customerBids.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          Quote from provider
                        </p>
                        <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 dark:border-neutral-600 dark:text-neutral-300">
                          {b.status}
                        </span>
                      </div>
                      {b.estimatedCost != null ? (
                        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                          Estimated cost: {new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(b.estimatedCost)}
                        </p>
                      ) : null}
                      {b.estimatedTimeline?.trim() ? (
                        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                          Timeline: {b.estimatedTimeline.trim()}
                        </p>
                      ) : null}
                      {b.notes?.trim() ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                          {b.notes.trim()}
                        </p>
                      ) : null}
                      {b.status === "submitted" && showRejectQuotes ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={awardBusyBidId !== null || rejectBidBusyId !== null}
                            onClick={() => void awardBid(b.id)}
                            className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                          >
                            {awardBusyBidId === b.id ? "Accepting…" : "Accept quote"}
                          </button>
                          <button
                            type="button"
                            disabled={awardBusyBidId !== null || rejectBidBusyId !== null}
                            onClick={() => void rejectBid(b.id)}
                            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-500/50 dark:bg-neutral-950 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            {rejectBidBusyId === b.id ? "Rejecting…" : "Reject quote"}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {showJobMessagesCta ? (
        <>
          {jobConvLoading ? (
            <section className="mb-8">
              <p className="text-sm text-neutral-500">Opening messages…</p>
            </section>
          ) : jobConvErr ? (
            <section className="mb-8">
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {jobConvErr}
              </p>
            </section>
          ) : jobConversationId ? (
            <Link
              href={`/messages/${encodeURIComponent(jobConversationId)}`}
              aria-label={
                jobConvUnreadCount > 0
                  ? `Open messages (${jobConvUnreadCount} unread)`
                  : "Open messages"
              }
              title={
                jobConvUnreadCount > 0
                  ? `${jobConvUnreadCount} unread message${jobConvUnreadCount === 1 ? "" : "s"}`
                  : "Open messages"
              }
              className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-white shadow-[0_12px_30px_-10px_rgba(79,70,229,0.7)] ring-2 ring-indigo-300/70 transition hover:scale-[1.03] hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 dark:bg-indigo-500 dark:ring-indigo-300/60 dark:hover:bg-indigo-400"
            >
              <span className="absolute -inset-1 -z-10 animate-pulse rounded-full bg-indigo-500/30" aria-hidden />
              {jobConvUnreadCount > 0 ? (
                <>
                  <span
                    className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-white dark:ring-neutral-900"
                    aria-hidden
                  >
                    {jobConvUnreadCount > 9 ? "9+" : jobConvUnreadCount}
                  </span>
                  <span
                    className="absolute -right-1 -top-1 h-5 w-5 animate-ping rounded-full bg-red-400/75"
                    aria-hidden
                  />
                </>
              ) : null}
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              <span className="text-sm font-semibold tracking-wide">Messages</span>
            </Link>
          ) : null}
        </>
      ) : null}

      <WorkOrderPlannerSection
        workOrderId={wo.id}
        status={wo.status}
        assignedTradesmanId={wo.assignedTradesmanId}
        meRole={me?.role ?? null}
        meId={me?.id ?? null}
      />

      {canViewExpenses ? (
        <section className="mb-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Expense tracker
              </h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Itemized provider expenses for this job.
              </p>
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Total:{" "}
              {new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
                expenseTotal,
              )}
            </p>
          </div>

          {canTrackExpenses ? (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Add expense item
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Item
                  <input
                    value={expenseItemLabel}
                    onChange={(e) => setExpenseItemLabel(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Timber, screws"
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Amount (EUR)
                  <input
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 89.50"
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 sm:col-span-2">
                  Notes (optional)
                  <textarea
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    rows={2}
                    maxLength={4000}
                    placeholder="Optional detail for this cost item."
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                </label>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={expenseBusy}
                  onClick={() => void submitExpense()}
                  className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {expenseBusy ? "Adding…" : "Add expense"}
                </button>
                {expenseMsg ? (
                  <p
                    className={`text-sm ${expenseMsg === "Expense added." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    role={expenseMsg === "Expense added." ? "status" : "alert"}
                  >
                    {expenseMsg}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {expensesErr ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {expensesErr}
            </p>
          ) : null}

          <div className="mt-4">
            {expensesLoading ? (
              <p className="text-sm text-neutral-500">Loading expenses…</p>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No expenses recorded yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_auto] gap-3 border-b border-neutral-200 bg-neutral-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                  <span>Details</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                </div>
                <ul className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950/40">
                  {expenses.map((item, idx) => (
                    <li
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_auto] gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {item.itemLabel}
                        </p>
                        {item.notes?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
                            {item.notes.trim()}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">-</p>
                        )}
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        {formatDateTime(item.incurredAt)}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                          {new Intl.NumberFormat("en-IE", {
                            style: "currency",
                            currency: "EUR",
                          }).format(item.amount)}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                          #{String(expenses.length - idx).padStart(3, "0")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {canUploadJobPhotos(me, wo) ? (
        <section className="mb-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Job photos</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Upload a site photo; it is stored securely and added to the timeline for everyone on this job.
          </p>
          {photoErr ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {photoErr}
            </p>
          ) : null}
          <div className="mt-4">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={photoBusy}
              className="block w-full max-w-md text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:text-neutral-300 dark:file:bg-neutral-100 dark:file:text-neutral-900"
              onChange={(e) => {
                const f = e.target.files;
                e.target.value = "";
                void onPickJobPhoto(f);
              }}
            />
            {photoBusy ? <p className="mt-2 text-xs text-neutral-500">Uploading…</p> : null}
          </div>
        </section>
      ) : null}

      {me?.role === "customer" && me.id === wo.customerId && reviewInfo ? (
        <CustomerReviewPanel workOrderId={wo.id} info={reviewInfo} onChanged={load} />
      ) : null}

      <section
        aria-labelledby="timeline-heading"
        className="rounded-2xl border border-neutral-200/80 bg-gradient-to-b from-neutral-50/70 to-white p-5 dark:border-neutral-800 dark:from-neutral-950/70 dark:to-neutral-950 sm:p-6"
      >
        <h2 id="timeline-heading" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Timeline
        </h2>
        {updates.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No updates on this job yet.</p>
        ) : (
          <ol className="mt-5 space-y-3">
            {updates.map((u) => (
              (() => {
                const isMediaUpload = u.updateType === "media_upload";
                const uploaderMeta = isMediaUpload ? mediaUploaderMeta(wo, u.authorId) : null;
                return (
              <li
                key={u.id}
                className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80"
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-neutral-200/80 dark:bg-neutral-700/80" aria-hidden />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="pl-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {isMediaUpload ? uploaderMeta?.label : u.updateType.replace(/_/g, " ")}
                  </span>
                  <time className="text-xs text-neutral-400 dark:text-neutral-500" dateTime={String(u.createdAt)}>
                    {formatDateTime(u.createdAt)}
                  </time>
                </div>
                {isMediaUpload && uploaderMeta ? (
                  <span
                    className={`mt-2 ml-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${uploaderMeta.className}`}
                  >
                    {uploaderMeta.label}
                  </span>
                ) : null}
                {u.content?.trim() ? (
                  <p className="mt-2 pl-1 text-sm text-neutral-700 dark:text-neutral-300">{u.content}</p>
                ) : null}
                {u.mediaUrls?.length ? (
                  <ul className="mt-3 flex flex-wrap gap-3 pl-1">
                    {u.mediaUrls.filter(isLikelyImageMediaUrl).map((src) => (
                      <li
                        key={src}
                        className="relative h-44 w-44 overflow-hidden rounded-xl border border-neutral-200 shadow-sm transition hover:shadow-md dark:border-neutral-700"
                      >
                        <button
                          type="button"
                          aria-label="Open photo"
                          onClick={() => setExpandedImageSrc(src)}
                          className="group relative block h-full w-full cursor-zoom-in"
                        >
                          <Image
                            src={src}
                            alt="Job photo"
                            fill
                            className="object-cover transition duration-200 group-hover:scale-[1.03]"
                            sizes="176px"
                            unoptimized
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
                );
              })()
            ))}
          </ol>
        )}
      </section>
      {expandedImageSrc ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded job photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setExpandedImageSrc(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedImageSrc(null)}
            className="absolute right-4 top-4 rounded-md bg-black/50 px-3 py-1.5 text-sm font-medium text-white hover:bg-black/70"
          >
            Close
          </button>
          <div
            className="relative h-[80vh] w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={expandedImageSrc}
              alt="Expanded job photo"
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
