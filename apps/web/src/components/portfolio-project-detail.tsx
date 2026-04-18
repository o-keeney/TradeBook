"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PortfolioGallerySlideshow } from "@/components/portfolio-gallery-slideshow";
import {
  type PendingPhoto,
  postPortfolioProjectImage,
  revokePendingList,
} from "@/lib/portfolio-upload";
import { formatBudgetDisplay } from "@/lib/format-budget";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  projectDate?: string | null;
  durationText?: string | null;
  budgetText?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ImageRow = {
  id: string;
  caption: string | null;
  sortOrder: number;
  mimeType: string;
  url: string;
};

function formatLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/** `projectDate` is stored as YYYY-MM-DD; parse as local calendar date to avoid UTC shift. */
function formatProjectDateChip(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return value;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  try {
    return new Date(y, mo, d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function PortfolioProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = typeof params.projectId === "string" ? params.projectId : "";
  const partialUploadNote = searchParams.get("upload") === "partial";

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectDate, setEditProjectDate] = useState("");
  const [editDurationText, setEditDurationText] = useState("");
  const [editBudgetText, setEditBudgetText] = useState("");
  const [editSaveBusy, setEditSaveBusy] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/portfolio/projects/${projectId}`);
      if (res.status === 401) {
        router.replace(`/login?next=/portfolio/${encodeURIComponent(projectId)}`);
        return;
      }
      if (res.status === 404) {
        setError("This project was not found or you do not have access.");
        setProject(null);
        setImages([]);
        return;
      }
      if (!res.ok) {
        setError("Could not load this project.");
        setProject(null);
        setImages([]);
        return;
      }
      const data = (await res.json()) as {
        project?: ProjectRow;
        images?: ImageRow[];
      };
      setProject(data.project ?? null);
      setImages(data.images ?? []);
    } catch {
      setError("Network error.");
      setProject(null);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!project) return;
    setEditTitle(project.title);
    setEditDescription(project.description ?? "");
    setEditProjectDate(project.projectDate?.trim() ?? "");
    setEditDurationText(project.durationText?.trim() ?? "");
    setEditBudgetText(project.budgetText?.trim() ?? "");
    setEditError(null);
    setEditMessage(null);
  }, [project]);

  const saveProjectDetails = async () => {
    if (!projectId) return;
    const t = editTitle.trim();
    if (!t) {
      setEditError("Title is required.");
      return;
    }
    setEditSaveBusy(true);
    setEditError(null);
    setEditMessage(null);
    try {
      const payload: Record<string, unknown> = {
        title: t,
        description: editDescription.trim(),
      };
      const pd = editProjectDate.trim();
      payload.projectDate = pd ? pd : null;
      const dur = editDurationText.trim();
      payload.durationText = dur ? dur : null;
      const bud = editBudgetText.trim();
      payload.budgetText = bud ? bud : null;

      const res = await apiFetch(`/api/portfolio/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string };
        project?: ProjectRow;
      };
      if (res.status === 403) {
        setEditError(
          data.error?.code === "email_not_verified"
            ? "Verify your email to update projects."
            : (data.error?.message ?? "You cannot update this project."),
        );
        return;
      }
      if (!res.ok) {
        setEditError(data.error?.message ?? "Could not save changes.");
        return;
      }
      if (data.project) {
        setProject(data.project);
      } else {
        await load();
      }
      setEditMessage("Changes saved.");
    } catch {
      setEditError("Network error.");
    } finally {
      setEditSaveBusy(false);
    }
  };

  const appendPhotos = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setPendingPhotos((prev) => {
      const next = [...prev];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        next.push({
          id: crypto.randomUUID(),
          file,
          caption: "",
          previewUrl: URL.createObjectURL(file),
        });
      }
      return next;
    });
  };

  const removePhoto = (id: string) => {
    setPendingPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setPendingPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  };

  const uploadQueued = async () => {
    if (!projectId || pendingPhotos.length === 0) return;
    setUploadBusy(true);
    setUploadMessage(null);
    const queue = [...pendingPhotos];
    const baseSort = (images.reduce((m, im) => Math.max(m, im.sortOrder), 0) || 0) + 1;
    try {
      for (let i = 0; i < queue.length; i++) {
        setUploadMessage(`Uploading ${i + 1} of ${queue.length}…`);
        const up = await postPortfolioProjectImage(
          projectId,
          queue[i].file,
          queue[i].caption,
          baseSort + i,
        );
        if (!up.ok) {
          setUploadMessage(`Upload failed: ${up.message}`);
          return;
        }
      }
      revokePendingList(queue);
      setPendingPhotos([]);
      setUploadMessage(`Uploaded ${queue.length} photo${queue.length === 1 ? "" : "s"}.`);
      await load();
    } catch {
      setUploadMessage("Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      setPendingPhotos((prev) => {
        revokePendingList(prev);
        return [];
      });
    };
  }, []);

  const deleteProject = async () => {
    if (!projectId) return;
    setDeleteInProgress(true);
    setDeleteError(null);
    try {
      const res = await apiFetch(`/api/portfolio/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        router.push("/portfolio");
        return;
      }
      if (res.status === 403) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string };
        };
        setDeleteError(
          j.error?.code === "email_not_verified"
            ? "Verify your email to delete projects."
            : (j.error?.message ?? "You cannot delete this project."),
        );
        return;
      }
      if (res.status === 404) {
        setDeleteError("This project was already removed.");
        return;
      }
      setDeleteError("Could not delete this project.");
    } catch {
      setDeleteError("Network error.");
    } finally {
      setDeleteInProgress(false);
    }
  };

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-neutral-500">Invalid project link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-neutral-500">
        Loading project…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/portfolio"
          className="text-sm font-medium text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Back to portfolio
        </Link>
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error ?? "Project not found."}
        </p>
      </div>
    );
  }

  const metaChips = [
    project.projectDate
      ? { label: "Date", value: formatProjectDateChip(project.projectDate) }
      : null,
    project.durationText ? { label: "Duration", value: project.durationText } : null,
    project.budgetText?.trim()
      ? { label: "Budget", value: formatBudgetDisplay(project.budgetText) }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-8">
      <nav className="mb-6">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <span aria-hidden>←</span> All projects
        </Link>
      </nav>

      {partialUploadNote ? (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          <p>
            Not every photo finished uploading. Add any missing shots in the{" "}
            <span className="font-medium">Add photos</span> section below.
          </p>
          <Link
            href={`/portfolio/${projectId}`}
            replace
            scroll={false}
            className="mt-2 inline-block text-xs font-medium text-amber-900 underline dark:text-amber-200"
          >
            Dismiss
          </Link>
        </div>
      ) : null}

      <header className="mb-10">
        {images.length === 0 ? (
          <div className="mb-8 flex aspect-[21/9] min-h-[10rem] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:border-neutral-700 dark:from-neutral-900 dark:to-neutral-800">
            <span className="text-sm font-medium text-neutral-500">No photos yet</span>
          </div>
        ) : null}

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          {project.title}
        </h1>

        {metaChips.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {metaChips.map((chip) => (
              <li
                key={chip.label}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <span className="text-neutral-500 dark:text-neutral-400">{chip.label}: </span>
                {chip.value}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
          Added {formatLongDate(project.createdAt)}
        </p>

        {project.description?.trim() ? (
          <div className="mt-8 max-w-3xl text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
            {project.description.split("\n").map((para, i) => (
              <p key={i} className={i > 0 ? "mt-4" : ""}>
                {para}
              </p>
            ))}
          </div>
        ) : null}
      </header>

      <section aria-labelledby="gallery-heading" className="border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <h2
          id="gallery-heading"
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
        >
          Gallery
        </h2>
        {images.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No images in this project yet.</p>
        ) : (
          <div className="mt-6">
            <PortfolioGallerySlideshow
              images={images.map((im) => ({ id: im.id, url: im.url, caption: im.caption }))}
            />
          </div>
        )}
      </section>

      <div className="mx-auto mt-12 max-w-3xl space-y-10">
      <section
        aria-labelledby="edit-project-heading"
        className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-6 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-900/80"
      >
        <h2
          id="edit-project-heading"
          className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
        >
          Edit project details
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Update how this project appears on your public portfolio.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="portfolio-edit-title"
              className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="portfolio-edit-title"
              className={inputClass}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={200}
              disabled={editSaveBusy || uploadBusy || deleteInProgress}
            />
          </div>
          <div>
            <label
              htmlFor="portfolio-edit-desc"
              className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >
              Description
            </label>
            <textarea
              id="portfolio-edit-desc"
              className={`${inputClass} min-h-[6rem]`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              maxLength={20_000}
              disabled={editSaveBusy || uploadBusy || deleteInProgress}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="portfolio-edit-date"
                className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
              >
                Project date <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="portfolio-edit-date"
                type="date"
                className={inputClass}
                value={editProjectDate}
                onChange={(e) => setEditProjectDate(e.target.value)}
                disabled={editSaveBusy || uploadBusy || deleteInProgress}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="portfolio-edit-duration"
                className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
              >
                Time taken
              </label>
              <input
                id="portfolio-edit-duration"
                className={inputClass}
                value={editDurationText}
                onChange={(e) => setEditDurationText(e.target.value)}
                placeholder="e.g. 2 weeks on site"
                maxLength={200}
                disabled={editSaveBusy || uploadBusy || deleteInProgress}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="portfolio-edit-budget"
              className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >
              Budget
            </label>
            <input
              id="portfolio-edit-budget"
              className={inputClass}
              value={editBudgetText}
              onChange={(e) => setEditBudgetText(e.target.value)}
              placeholder="e.g. €8,000–€10,000"
              maxLength={200}
              disabled={editSaveBusy || uploadBusy || deleteInProgress}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={editSaveBusy || uploadBusy || deleteInProgress}
            onClick={() => void saveProjectDetails()}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {editSaveBusy ? "Saving…" : "Save changes"}
          </button>
        </div>
        {editError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {editError}
            {editError.includes("Verify your email") ? (
              <span className="mt-1 block">
                <Link
                  href="/dashboard"
                  className="font-medium text-red-800 underline dark:text-red-300"
                >
                  Open dashboard →
                </Link>
              </span>
            ) : null}
          </p>
        ) : null}
        {editMessage ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {editMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-6 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-900/80">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Add photos
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Queue multiple files, add an optional description per image, then upload.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            appendPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploadBusy}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium dark:border-neutral-600 dark:bg-neutral-900"
          >
            Choose photos…
          </button>
          {pendingPhotos.length > 0 ? (
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => void uploadQueued()}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Upload {pendingPhotos.length} queued
            </button>
          ) : null}
        </div>
        {pendingPhotos.length > 0 ? (
          <ul className="mt-5 space-y-4">
            {pendingPhotos.map((ph) => (
              <li
                key={ph.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-950 sm:flex-row"
              >
                <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:h-24 sm:w-32 dark:bg-neutral-900">
                  <img src={ph.previewUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-neutral-500">{ph.file.name}</p>
                  <label className="mt-2 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Description (optional)
                    <textarea
                      value={ph.caption}
                      onChange={(e) => updateCaption(ph.id, e.target.value)}
                      rows={2}
                      maxLength={500}
                      className={`${inputClass} mt-1 min-h-[3rem] text-sm`}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={() => removePhoto(ph.id)}
                  className="self-start text-xs text-red-600 underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {uploadMessage ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{uploadMessage}</p>
        ) : null}
      </section>

      <section
        aria-labelledby="delete-project-heading"
        className="rounded-2xl border border-red-200/80 bg-red-50/50 p-6 dark:border-red-900/40 dark:bg-red-950/20"
      >
        <h2
          id="delete-project-heading"
          className="text-sm font-semibold uppercase tracking-wide text-red-800 dark:text-red-300"
        >
          Delete project
        </h2>
        <p className="mt-2 text-sm text-red-900/90 dark:text-red-200/90">
          This permanently removes this project and all of its photos from your portfolio and public
          profile. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            disabled={uploadBusy || deleteInProgress}
            onClick={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
            className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
          >
            Delete project…
          </button>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-red-950 dark:text-red-100">
              Delete “{project.title}” permanently?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleteInProgress}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium dark:border-neutral-600 dark:bg-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteInProgress}
                onClick={() => void deleteProject()}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
              >
                {deleteInProgress ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        )}
        {deleteError ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
            {deleteError}
          </p>
        ) : null}
      </section>
      </div>
    </article>
  );
}
