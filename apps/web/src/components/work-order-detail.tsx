"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
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

function statusBannerClass(status: string): string {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100";
    case "cancelled":
    case "declined":
    case "customer_rejected":
      return "border-neutral-300 bg-neutral-100 text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-200";
    case "open_bidding":
    case "quotes_submitted":
      return "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100";
    default:
      return "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100";
  }
}

function canUploadJobPhotos(me: { id: string } | null, wo: WorkOrderRow): boolean {
  if (!me) return false;
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
      setMe(null);
      setReviewInfo(null);
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

  const showRejectQuotes =
    me?.role === "customer" &&
    me.id === wo.customerId &&
    wo.submissionType === "open_bid" &&
    (wo.status === "open_bidding" || wo.status === "quotes_submitted");

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

      <WorkOrderPlannerSection
        workOrderId={wo.id}
        status={wo.status}
        assignedTradesmanId={wo.assignedTradesmanId}
        meRole={me?.role ?? null}
        meId={me?.id ?? null}
      />

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
                {u.mediaUrls?.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {u.mediaUrls.filter(isLikelyImageMediaUrl).map((src) => (
                      <li key={src} className="relative h-40 w-40 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <Image
                          src={src}
                          alt="Job photo"
                          fill
                          className="object-cover"
                          sizes="160px"
                          unoptimized
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
