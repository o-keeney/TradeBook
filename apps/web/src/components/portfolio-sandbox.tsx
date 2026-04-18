"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  type PendingPhoto,
  postPortfolioProjectImage,
  revokePendingList,
} from "@/lib/portfolio-upload";
import { formatBudgetDisplay } from "@/lib/format-budget";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

type PortfolioProject = {
  id: string;
  userId: string;
  title: string;
  description: string;
  projectDate?: string | null;
  durationText?: string | null;
  budgetText?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function formatProjectDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function projectMetaLine(p: PortfolioProject): string {
  const budget =
    typeof p.budgetText === "string" && p.budgetText.trim().length > 0
      ? formatBudgetDisplay(p.budgetText)
      : null;
  const parts = [p.projectDate, p.durationText, budget].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  if (parts.length) return parts.join(" · ");
  return formatProjectDate(p.createdAt);
}

export function TradesmanPortfolioManager() {
  const router = useRouter();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [covers, setCovers] = useState<Record<string, string | null>>({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [durationText, setDurationText] = useState("");
  const [budgetText, setBudgetText] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState<string | null>(null);

  const [projectPendingDelete, setProjectPendingDelete] = useState<PortfolioProject | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const createPhotoInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setListError(null);
    try {
      const res = await apiFetch("/api/portfolio/projects");
      if (res.status === 401) {
        setListError("Sign in as a tradesman to manage your portfolio.");
        setProjects([]);
        return;
      }
      if (res.status === 403) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string };
        };
        if (j.error?.code === "email_not_verified") {
          setListError(
            "Verify your email to manage portfolio projects. You can resend the link from your dashboard.",
          );
        } else {
          setListError(j.error?.message ?? "You do not have access to portfolio tools.");
        }
        setProjects([]);
        return;
      }
      if (!res.ok) {
        setListError("Could not load projects.");
        setProjects([]);
        return;
      }
      const data = (await res.json()) as { projects?: PortfolioProject[] };
      setProjects(data.projects ?? []);
    } catch {
      setListError("Network error loading projects.");
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projects.length) {
      setCovers({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, string | null> = {};
      await Promise.all(
        projects.map(async (p) => {
          const res = await apiFetch(`/api/portfolio/projects/${p.id}`);
          if (!res.ok) {
            next[p.id] = null;
            return;
          }
          const data = (await res.json()) as { images?: { url: string }[] };
          next[p.id] = data.images?.[0]?.url ?? null;
        }),
      );
      if (!cancelled) setCovers(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  useEffect(() => {
    if (!showCreateModal) return;
    const t = window.setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [showCreateModal]);

  useEffect(() => {
    if (!showCreateModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCreateModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCreateModal]);

  const closeCreateModal = () => {
    setPendingPhotos((prev) => {
      revokePendingList(prev);
      return [];
    });
    setCreateError(null);
    setCreateProgress(null);
    setShowCreateModal(false);
  };

  const openCreateModal = () => {
    setCreateError(null);
    setCreateProgress(null);
    setTitle("");
    setDescription("");
    setProjectDate("");
    setDurationText("");
    setBudgetText("");
    setPendingPhotos([]);
    setShowCreateModal(true);
  };

  const appendCreatePhotos = (fileList: FileList | null) => {
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

  const removeCreatePhoto = (id: string) => {
    setPendingPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const updateCreateCaption = (id: string, caption: string) => {
    setPendingPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  };

  const createProjectAndUploads = async () => {
    const t = title.trim();
    if (!t) {
      setCreateError("Please enter a project title.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreateProgress(null);
    try {
      const payload: Record<string, unknown> = {
        title: t,
        description: description.trim(),
      };
      const pd = projectDate.trim();
      if (pd) payload.projectDate = pd;
      const dur = durationText.trim();
      if (dur) payload.durationText = dur;
      const bud = budgetText.trim();
      if (bud) payload.budgetText = bud;

      const res = await apiFetch("/api/portfolio/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        setCreateError(
          res.status === 403 ? "Verify your email to create projects." : text.slice(0, 240),
        );
        return;
      }
      const j = JSON.parse(text) as { project?: { id: string } };
      const projectId = j.project?.id;
      if (!projectId) {
        setCreateError("Project created but response was unexpected.");
        return;
      }

      const queue = [...pendingPhotos];
      for (let i = 0; i < queue.length; i++) {
        setCreateProgress(`Uploading photo ${i + 1} of ${queue.length}…`);
        const item = queue[i];
        const up = await postPortfolioProjectImage(projectId, item.file, item.caption, i);
        if (!up.ok) {
          revokePendingList(queue);
          setPendingPhotos([]);
          setCreateError(null);
          setCreateProgress(null);
          setShowCreateModal(false);
          await loadProjects();
          router.push(`/portfolio/${projectId}?upload=partial`);
          return;
        }
      }

      revokePendingList(queue);
      setPendingPhotos([]);
      closeCreateModal();
      await loadProjects();
      router.push(`/portfolio/${projectId}`);
    } catch {
      setCreateError("Could not create project.");
    } finally {
      setCreating(false);
      setCreateProgress(null);
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectPendingDelete) return;
    setDeleteInProgress(true);
    setDeleteError(null);
    try {
      const res = await apiFetch(`/api/portfolio/projects/${projectPendingDelete.id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        setProjectPendingDelete(null);
        await loadProjects();
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
        setProjectPendingDelete(null);
        await loadProjects();
        return;
      }
      setDeleteError("Could not delete this project.");
    } catch {
      setDeleteError("Network error.");
    } finally {
      setDeleteInProgress(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Your projects
          </h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
            Showcase work on your public profile.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white sm:self-auto"
        >
          <span className="text-lg leading-none">+</span>
          New project
        </button>
      </div>

      {listError ? (
        <div
          className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          role="alert"
        >
          <p>{listError}</p>
          {listError.includes("Verify your email") ? (
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
      ) : null}

      {loadingProjects ? (
        <p className="py-16 text-center text-sm text-neutral-500">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 py-16 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            No projects yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
            Create your first portfolio piece to appear on your public tradesman page.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Create a project
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const cover = covers[p.id];
            return (
              <li key={p.id} className="relative">
                <Link
                  href={`/portfolio/${p.id}`}
                  className="group block w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
                >
                  <div className="relative aspect-[16/10] w-full bg-neutral-100 dark:bg-neutral-900">
                    {cover ? (
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 text-neutral-500 dark:from-neutral-800 dark:to-neutral-900 dark:text-neutral-500">
                        <span className="text-xs font-medium uppercase tracking-wide">
                          No cover yet
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 p-4">
                    <h3 className="line-clamp-1 font-semibold text-neutral-900 dark:text-neutral-100">
                      {p.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {p.description || "No description"}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {projectMetaLine(p)}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setProjectPendingDelete(p);
                  }}
                  className="absolute right-3 top-3 z-10 rounded-lg border border-neutral-200/80 bg-white/95 px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm backdrop-blur hover:bg-red-50 dark:border-neutral-700 dark:bg-neutral-950/95 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {projectPendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleteInProgress) {
              setProjectPendingDelete(null);
              setDeleteError(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-950"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-delete-title"
          >
            <h2
              id="portfolio-delete-title"
              className="text-lg font-semibold text-neutral-900 dark:text-neutral-50"
            >
              Delete project?
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {projectPendingDelete.title}
              </span>{" "}
              and all of its photos will be removed from your portfolio. This cannot be undone.
            </p>
            {deleteError ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
                {deleteError}
                {deleteError.includes("Verify your email") ? (
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
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteInProgress}
                onClick={() => {
                  setProjectPendingDelete(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium dark:border-neutral-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteInProgress}
                onClick={() => void confirmDeleteProject()}
                className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
              >
                {deleteInProgress ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !creating) closeCreateModal();
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-950"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-create-title"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Project creation
                </p>
                <h2
                  id="portfolio-create-title"
                  className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50"
                >
                  New portfolio project
                </h2>
              </div>
              <button
                type="button"
                disabled={creating}
                onClick={() => closeCreateModal()}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <fieldset disabled={creating} className="space-y-6">
                <legend className="sr-only">Project details</legend>
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Details
                  </h3>
                  <div>
                    <label
                      htmlFor="portfolio-new-title"
                      className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                    >
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="portfolio-new-title"
                      ref={titleInputRef}
                      className={inputClass}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Kitchen refit, Dublin 8"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="portfolio-new-desc"
                      className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                    >
                      Overall description
                    </label>
                    <textarea
                      id="portfolio-new-desc"
                      className={`${inputClass} min-h-[6rem]`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Scope, materials, outcome…"
                      maxLength={20_000}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="portfolio-project-date"
                        className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                      >
                        Project date <span className="font-normal text-neutral-500">(optional)</span>
                      </label>
                      <input
                        id="portfolio-project-date"
                        type="date"
                        className={inputClass}
                        value={projectDate}
                        onChange={(e) => setProjectDate(e.target.value)}
                        aria-required={false}
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Leave blank if you do not want a date on the project.
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="portfolio-duration"
                        className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                      >
                        Time taken
                      </label>
                      <input
                        id="portfolio-duration"
                        className={inputClass}
                        value={durationText}
                        onChange={(e) => setDurationText(e.target.value)}
                        placeholder="e.g. 2 weeks on site, 3 days"
                        maxLength={200}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="portfolio-budget"
                      className="text-sm font-medium text-neutral-800 dark:text-neutral-200"
                    >
                      Budget
                    </label>
                    <input
                      id="portfolio-budget"
                      className={inputClass}
                      value={budgetText}
                      onChange={(e) => setBudgetText(e.target.value)}
                      placeholder="e.g. €8,000–€10,000"
                      maxLength={200}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Photos
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Add one or more images. Each photo can have an optional description (shown as a
                    caption on your public portfolio).
                  </p>
                  <input
                    ref={createPhotoInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      appendCreatePhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => createPhotoInputRef.current?.click()}
                    className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-medium dark:border-neutral-600 dark:bg-neutral-900"
                  >
                    Add photos…
                  </button>
                  {pendingPhotos.length > 0 ? (
                    <ul className="space-y-4 pt-2">
                      {pendingPhotos.map((ph) => (
                        <li
                          key={ph.id}
                          className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/60 sm:flex-row"
                        >
                          <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg bg-neutral-200 sm:h-24 sm:w-36 dark:bg-neutral-800">
                            <img
                              src={ph.previewUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="truncate text-xs text-neutral-500">{ph.file.name}</p>
                            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              Description (optional)
                              <textarea
                                value={ph.caption}
                                onChange={(e) => updateCreateCaption(ph.id, e.target.value)}
                                rows={2}
                                maxLength={500}
                                className={`${inputClass} mt-1 min-h-[3rem] text-sm`}
                                placeholder="What does this photo show?"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCreatePhoto(ph.id)}
                            className="self-start text-xs text-red-600 underline dark:text-red-400"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs italic text-neutral-400">No photos queued yet.</p>
                  )}
                </section>
              </fieldset>

              {createError ? (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                  {createError}
                </p>
              ) : null}
              {createProgress ? (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{createProgress}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={creating}
                onClick={() => closeCreateModal()}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium dark:border-neutral-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void createProjectAndUploads()}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {creating ? "Saving…" : "Create project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
