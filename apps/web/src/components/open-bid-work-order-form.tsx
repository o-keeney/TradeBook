"use client";

import { CONSTRUCTION_PROFESSIONS } from "@tradebook/construction-professions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MeUser } from "@/components/auth-nav";
import { MapboxAddressField } from "@/components/mapbox-address-field";
import type { MapboxAddressCoords } from "@/components/mapbox-address-field";
import { apiFetch } from "@/lib/api";
import {
  meRequiresEmailVerifiedForMutations,
  meRequiresSmsVerifiedForMutations,
} from "@/lib/mutation-verification";
import { type PendingPhoto, revokePendingList } from "@/lib/portfolio-upload";
import { postWorkOrderJobImageWithCaption } from "@/lib/work-order-media";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";
const MAX_OPEN_BID_PHOTOS = 12;

function extractEircode(rawAddress: string): string | null {
  const m = rawAddress
    .toUpperCase()
    .match(/\b([AC-FHKNPRTV-Y]\d{2})\s?([AC-FHKNPRTV-Y0-9]{4})\b/);
  if (!m) return null;
  return `${m[1]} ${m[2]}`;
}

export function OpenBidWorkOrderForm() {
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null | undefined>(undefined);
  const [tradeCategory, setTradeCategory] = useState<string>(CONSTRUCTION_PROFESSIONS[0] ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationCoords, setLocationCoords] = useState<MapboxAddressCoords | null>(null);
  const [budgetText, setBudgetText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [workOrderIdForRecovery, setWorkOrderIdForRecovery] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;

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
        if (!cancelled) setMe(j.user ?? null);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    return () => revokePendingList(pendingPhotosRef.current);
  }, []);

  if (me === undefined || me?.role !== "customer") return null;

  const needsEmailVerify = meRequiresEmailVerifiedForMutations(me) && !me.emailVerified;
  const needsPhoneVerify = meRequiresSmsVerifiedForMutations(me) && !me.phoneVerified;
  const blocked = needsEmailVerify || needsPhoneVerify;

  function appendPhotos(list: FileList | null) {
    if (!list?.length) return;
    setPendingPhotos((prev) => {
      const next = [...prev];
      const room = MAX_OPEN_BID_PHOTOS - next.length;
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
  }

  function removePhoto(photoId: string) {
    setPendingPhotos((prev) => {
      const item = prev.find((p) => p.id === photoId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  }

  function updatePhotoCaption(photoId: string, caption: string) {
    setPendingPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, caption } : p)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (blocked || submitting) return;
    setSubmitting(true);
    setError(null);
    setUploadStep(null);
    setWorkOrderIdForRecovery(null);
    try {
      const body: Record<string, unknown> = {
        submissionType: "open_bid",
        tradeCategory,
        title: title.trim(),
        description: description.trim(),
        locationAddress: locationAddress.trim(),
      };
      const eircode = extractEircode(locationAddress.trim());
      if (!eircode) {
        setError("Please select an address that includes an Eircode.");
        setSubmitting(false);
        return;
      }
      body.locationPostcode = eircode;
      if (locationCoords) {
        body.dimensions = { locationCoords };
      }
      const budget = budgetText.trim();
      if (budget) body.budgetText = budget.slice(0, 200);
      if (dueDate.trim()) {
        const dt = new Date(dueDate);
        if (!Number.isNaN(dt.getTime())) body.dueDate = dt.toISOString();
      }
      const res = await apiFetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as {
        workOrder?: { id?: string };
        error?: { code?: string; message?: string };
      };
      if (!res.ok) {
        if (j.error?.code === "email_not_verified") {
          setError("Verify your email before posting a job.");
          return;
        }
        if (j.error?.code === "phone_not_verified") {
          setError("Phone verification is required before posting a job.");
          return;
        }
        setError(j.error?.message ?? "Could not create work order.");
        return;
      }
      const id = j.workOrder?.id;
      if (!id) {
        setError("Work order created, but no id was returned.");
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
      router.push(`/work-orders/${encodeURIComponent(id)}`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
      setUploadStep(null);
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Post open job for bids
      </h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Your job is posted as an open bid so tradespeople can submit quotes for you to review.
      </p>

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
          Phone verification is required before posting.
        </p>
      ) : null}

      <form onSubmit={(ev) => void onSubmit(ev)} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Trade
          <select
            className={inputClass}
            value={tradeCategory}
            onChange={(e) => setTradeCategory(e.target.value)}
            disabled={blocked}
            required
          >
            {CONSTRUCTION_PROFESSIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Job title
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            disabled={blocked}
            required
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 sm:col-span-2">
          Description
          <textarea
            className={`${inputClass} min-h-[110px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={20_000}
            disabled={blocked}
            required
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 sm:col-span-2">
          Address (autocomplete or map pin)
          <div className="mt-1.5">
            <MapboxAddressField
              value={locationAddress}
              required
              placeholder="Search by address or drop a pin"
              inputClassName={inputClass}
              onChange={(placeName, coords) => {
                setLocationAddress(placeName);
                setLocationCoords(coords ?? null);
              }}
            />
          </div>
          <span className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
            Use one address field only. We automatically extract the Eircode from your selection.
          </span>
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Budget (optional)
          <input
            className={inputClass}
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            maxLength={200}
            disabled={blocked}
            placeholder="e.g. €3,000–€5,000"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Due date (optional)
          <input
            type="date"
            className={inputClass}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={blocked}
          />
        </label>

        <div className="sm:col-span-2 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Site photos (optional)</h3>
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={blocked}
            onChange={(e) => {
              appendPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={blocked || pendingPhotos.length >= MAX_OPEN_BID_PHOTOS}
            onClick={() => photoInputRef.current?.click()}
            className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          >
            Add photos…
          </button>
          {pendingPhotos.length >= MAX_OPEN_BID_PHOTOS ? (
            <p className="text-xs text-neutral-500">Maximum {MAX_OPEN_BID_PHOTOS} photos per job.</p>
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
                        disabled={blocked}
                        className={`${inputClass} mt-1 min-h-[3rem] text-sm`}
                        placeholder="What does this photo show?"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={blocked}
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

        {error ? (
          <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
            {workOrderIdForRecovery ? (
              <>
                {" "}
                <Link
                  href={`/work-orders/${encodeURIComponent(workOrderIdForRecovery)}`}
                  className="font-medium underline"
                >
                  Open your job
                </Link>{" "}
                to add photos from the job page.
              </>
            ) : null}
          </p>
        ) : null}

        {uploadStep ? (
          <p className="sm:col-span-2 text-sm text-neutral-600 dark:text-neutral-400" aria-live="polite">
            {uploadStep}
          </p>
        ) : null}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting || blocked}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {submitting ? (uploadStep ? "Uploading…" : "Posting…") : "Post open job"}
          </button>
        </div>
      </form>
    </section>
  );
}
