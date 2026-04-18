"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CONSTRUCTION_PROFESSIONS,
  isConstructionProfession,
} from "@tradebook/construction-professions";
import type { MeUser } from "@/components/auth-nav";
import { apiFetch } from "@/lib/api";
import {
  meRequiresEmailVerifiedForMutations,
  meRequiresSmsVerifiedForMutations,
} from "@/lib/mutation-verification";
import { type PendingPhoto, revokePendingList } from "@/lib/portfolio-upload";
import { postWorkOrderJobImageWithCaption } from "@/lib/work-order-media";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

const MAX_JOB_REQUEST_PHOTOS = 12;

function pickDefaultTradeCategory(suggested: string[]): string {
  for (const s of suggested) {
    if (isConstructionProfession(s)) return s;
  }
  return CONSTRUCTION_PROFESSIONS[0] ?? "";
}

export function RequestWorkOrderToTradesman({
  tradesmanUserId,
  tradesmanDisplayName,
  suggestedTradeCategories,
  tradesmanAvailable,
}: {
  tradesmanUserId: string;
  tradesmanDisplayName: string;
  suggestedTradeCategories: string[];
  tradesmanAvailable: boolean;
}) {
  const router = useRouter();
  const nextPath = `/find-tradesmen/${encodeURIComponent(tradesmanUserId)}`;

  const [me, setMe] = useState<MeUser | null | undefined>(undefined);
  const [tradeCategory, setTradeCategory] = useState(() => pickDefaultTradeCategory(suggestedTradeCategories));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationPostcode, setLocationPostcode] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workOrderIdForRecovery, setWorkOrderIdForRecovery] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;

  useEffect(() => {
    return () => revokePendingList(pendingPhotosRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/api/users/me");
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const j = (await res.json()) as { user?: MeUser };
        if (!cancelled) {
          setMe(j.user ?? null);
        }
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setTradeCategory(pickDefaultTradeCategory(suggestedTradeCategories));
  }, [suggestedTradeCategories]);

  const canShowForm = me?.role === "customer";
  const needsEmailVerify = Boolean(
    canShowForm && me && meRequiresEmailVerifiedForMutations(me) && !me.emailVerified,
  );
  const needsPhoneVerify = Boolean(
    canShowForm && me && meRequiresSmsVerifiedForMutations(me) && !me.phoneVerified,
  );
  const needsVerificationGate = needsEmailVerify || needsPhoneVerify;

  const professionOptions = useMemo(() => [...CONSTRUCTION_PROFESSIONS], []);

  const appendPhotos = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    setPendingPhotos((prev) => {
      const next = [...prev];
      const room = MAX_JOB_REQUEST_PHOTOS - next.length;
      if (room <= 0) return prev;
      const take = Math.min(room, list.length);
      for (let i = 0; i < take; i++) {
        const file = list[i];
        if (!file) continue;
        next.push({
          id: crypto.randomUUID(),
          file,
          caption: "",
          previewUrl: URL.createObjectURL(file),
        });
      }
      return next;
    });
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPendingPhotos((prev) => {
      const item = prev.find((p) => p.id === photoId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  }, []);

  const updatePhotoCaption = useCallback((photoId: string, caption: string) => {
    setPendingPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, caption } : p)));
  }, []);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!canShowForm || needsVerificationGate || submitting) return;
      const t = title.trim();
      const d = description.trim();
      const addr = locationAddress.trim();
      const pc = locationPostcode.trim();
      if (!t || !d || !addr || !pc || !tradeCategory) {
        setError("Please fill in all required fields.");
        return;
      }
      setSubmitting(true);
      setUploadStep(null);
      setError(null);
      setWorkOrderIdForRecovery(null);
      try {
        const body: Record<string, unknown> = {
          submissionType: "direct",
          assignedTradesmanId: tradesmanUserId,
          tradeCategory,
          title: t,
          description: d,
          locationAddress: addr,
          locationPostcode: pc,
        };
        if (dueDate.trim()) {
          const dt = new Date(dueDate);
          if (!Number.isNaN(dt.getTime())) body.dueDate = dt.toISOString();
        }
        const br = budgetRange.trim();
        if (br) body.budgetText = br.slice(0, 200);
        const res = await apiFetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const raw = await res.text();
        if (res.status === 403) {
          try {
            const j = JSON.parse(raw) as { error?: { code?: string; message?: string } };
            if (j.error?.code === "email_not_verified") {
              setError("Verify your email before posting a job. You can resend the link from your dashboard.");
              return;
            }
            if (j.error?.code === "phone_not_verified") {
              setError(
                "Your phone must be verified before posting a job. An admin can mark your number as verified for testing.",
              );
              return;
            }
          } catch {
            /* ignore */
          }
          setError("You do not have permission to post this job.");
          return;
        }
        if (!res.ok) {
          let msg = "Could not create the work order.";
          try {
            const j = JSON.parse(raw) as { error?: { message?: string } };
            if (j.error?.message) msg = j.error.message;
          } catch {
            /* ignore */
          }
          setError(msg);
          return;
        }
        const j = JSON.parse(raw) as { workOrder?: { id?: string } };
        const id = j.workOrder?.id;
        if (!id) {
          setError("Created, but could not open the job. Check work orders.");
          return;
        }

        const queue = [...pendingPhotos];
        for (let i = 0; i < queue.length; i++) {
          setUploadStep(`Uploading photo ${i + 1} of ${queue.length}…`);
          const item = queue[i]!;
          const up = await postWorkOrderJobImageWithCaption(id, item.file, item.caption);
          if (!up.ok) {
            revokePendingList(queue);
            setPendingPhotos([]);
            setWorkOrderIdForRecovery(id);
            setError(
              queue.length > 1
                ? `Your job was saved, but a photo could not be added (${up.message}). Earlier photos may already be on the job.`
                : `Your job was saved, but the photo could not be added (${up.message}).`,
            );
            setUploadStep(null);
            setSubmitting(false);
            return;
          }
        }
        if (queue.length) {
          revokePendingList(queue);
          setPendingPhotos([]);
        }
        setUploadStep(null);
        router.push(`/work-orders/${encodeURIComponent(id)}`);
      } catch {
        setError("Network error.");
      } finally {
        setSubmitting(false);
        setUploadStep(null);
      }
    },
    [
      canShowForm,
      needsVerificationGate,
      submitting,
      title,
      description,
      locationAddress,
      locationPostcode,
      tradeCategory,
      dueDate,
      budgetRange,
      tradesmanUserId,
      router,
      pendingPhotos,
    ],
  );

  if (me === undefined) {
    return (
      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
        <p className="text-sm text-neutral-500">Loading…</p>
      </section>
    );
  }

  if (me?.role === "tradesman" && me.id === tradesmanUserId) {
    return null;
  }

  if (me && me.role !== "customer") {
    return (
      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Hire this tradesperson</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Only <strong>customer</strong> accounts can send a direct job request from this page. Sign in with a customer
          account, or register as a customer.
        </p>
        <p className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Sign in
          </Link>
          <Link
            href={`/register/customer?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 dark:border-neutral-600 dark:text-neutral-200"
          >
            Register as customer
          </Link>
        </p>
      </section>
    );
  }

  if (!me) {
    return (
      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Hire {tradesmanDisplayName}</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Send a direct job request with a short description and where the work is. The tradesperson can accept or
          decline from their dashboard.
        </p>
        <p className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Sign in to request work
          </Link>
          <Link
            href={`/register/customer?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 dark:border-neutral-600 dark:text-neutral-200"
          >
            Create customer account
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Request work from {tradesmanDisplayName}
      </h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        This creates a <strong>direct</strong> job assigned to them. They will be notified by email (when configured)
        and can accept or decline.
      </p>
      {!tradesmanAvailable ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          They have marked themselves as unavailable; you can still send a request if you would like them to review
          it.
        </p>
      ) : null}

      {needsEmailVerify ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Verify your email before posting a job.{" "}
          <Link href="/dashboard" className="font-medium underline">
            Open dashboard
          </Link>
        </p>
      ) : null}
      {needsPhoneVerify ? (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
          Phone verification is required before posting. Ask an admin to mark your account as phone-verified for
          testing, or turn the requirement off under Admin → Verification.
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          <p>{error}</p>
          {workOrderIdForRecovery ? (
            <p className="mt-2">
              <Link
                href={`/work-orders/${encodeURIComponent(workOrderIdForRecovery)}`}
                className="font-medium text-red-800 underline underline-offset-2 dark:text-red-300"
              >
                Open your job
              </Link>{" "}
              to add photos from the job page if needed.
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={(ev) => void submit(ev)} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Trade / specialty <span className="text-red-600">*</span>
          <select
            className={inputClass}
            value={tradeCategory}
            onChange={(e) => setTradeCategory(e.target.value)}
            required
            disabled={needsVerificationGate}
          >
            {professionOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Job title <span className="text-red-600">*</span>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Replace bathroom suite"
            required
            disabled={needsVerificationGate}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Description <span className="text-red-600">*</span>
          <textarea
            className={`${inputClass} min-h-[120px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={20_000}
            placeholder="What needs doing, access, materials, timing preferences…"
            required
            disabled={needsVerificationGate}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Budget range <span className="font-normal text-neutral-500">(optional)</span>
          <input
            className={inputClass}
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            maxLength={200}
            placeholder="e.g. €3,000–€5,000, or €40/hour × approx. 3 days"
            disabled={needsVerificationGate}
          />
          <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
            Free text — include currency if you can so the tradesperson sees a clear range.
          </span>
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Job location (address) <span className="text-red-600">*</span>
          <input
            className={inputClass}
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            maxLength={500}
            placeholder="Street, town"
            required
            disabled={needsVerificationGate}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Postcode / Eircode <span className="text-red-600">*</span>
          <input
            className={inputClass}
            value={locationPostcode}
            onChange={(e) => setLocationPostcode(e.target.value)}
            maxLength={20}
            placeholder="e.g. D02 AF30"
            required
            disabled={needsVerificationGate}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Preferred start or due date (optional)
          <input
            type="datetime-local"
            className={inputClass}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={needsVerificationGate}
          />
        </label>

        <div className="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Site photos (optional)</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Add images to show the scope of work. Each photo can have an optional description (shown on the job
            timeline), similar to portfolio projects.
          </p>
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={needsVerificationGate}
            onChange={(e) => {
              appendPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={needsVerificationGate || pendingPhotos.length >= MAX_JOB_REQUEST_PHOTOS}
            onClick={() => photoInputRef.current?.click()}
            className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          >
            Add photos…
          </button>
          {pendingPhotos.length >= MAX_JOB_REQUEST_PHOTOS ? (
            <p className="text-xs text-neutral-500">Maximum {MAX_JOB_REQUEST_PHOTOS} photos per request.</p>
          ) : null}
          {pendingPhotos.length > 0 ? (
            <ul className="space-y-4 pt-2">
              {pendingPhotos.map((ph) => (
                <li
                  key={ph.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/60 sm:flex-row"
                >
                  <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg bg-neutral-200 sm:h-24 sm:w-36 dark:bg-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URLs */}
                    <img src={ph.previewUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate text-xs text-neutral-500">{ph.file.name}</p>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Description (optional)
                      <textarea
                        value={ph.caption}
                        onChange={(e) => updatePhotoCaption(ph.id, e.target.value)}
                        rows={2}
                        maxLength={500}
                        disabled={needsVerificationGate}
                        className={`${inputClass} mt-1 min-h-[3rem] text-sm`}
                        placeholder="What does this photo show?"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={needsVerificationGate}
                    onClick={() => removePhoto(ph.id)}
                    className="self-start text-xs text-red-600 underline disabled:opacity-50 dark:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-neutral-400">No photos added.</p>
          )}
        </div>

        {uploadStep ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400" aria-live="polite">
            {uploadStep}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || needsVerificationGate}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {submitting ? (uploadStep ? "Uploading…" : "Sending…") : "Send job request"}
        </button>
      </form>
    </section>
  );
}
