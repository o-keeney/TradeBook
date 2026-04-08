"use client";

import { useCallback, useState } from "react";
import { compressImageForUpload } from "@/lib/compress-image";
import { getPublicApiUrl } from "@/lib/public-env";

export function PortfolioSandbox() {
  const base = getPublicApiUrl().replace(/\/$/, "");
  const [title, setTitle] = useState("Kitchen refit");
  const [description, setDescription] = useState("Full cabinet replacement and tiling.");
  const [projectId, setProjectId] = useState("");
  const [tradesmanId, setTradesmanId] = useState("");
  const [profileBio, setProfileBio] = useState("Experienced carpenter, Dublin area.");
  const [tradeCategories, setTradeCategories] = useState("carpentry, kitchens");
  const [log, setLog] = useState("");

  const append = useCallback((msg: string) => {
    setLog((prev) => `${prev}\n${msg}`);
  }, []);

  const createProject = async () => {
    const res = await fetch(`${base}/api/portfolio/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, description }),
    });
    const text = await res.text();
    append(`create project ${res.status}: ${text}`);
    try {
      const j = JSON.parse(text) as { project?: { id: string } };
      if (j.project?.id) setProjectId(j.project.id);
    } catch {
      /* ignore */
    }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) {
      append("Set project id (create a project first).");
      return;
    }
    const before = file.size;
    const toUpload = await compressImageForUpload(file);
    append(
      `compress: ${before} → ${toUpload.size} bytes (${file.type} → ${toUpload.type})`,
    );
    const fd = new FormData();
    fd.append("file", toUpload);
    fd.append("caption", "Site photo");
    const res = await fetch(`${base}/api/portfolio/projects/${projectId}/images`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const text = await res.text();
    append(`upload ${res.status}: ${text}`);
    e.target.value = "";
  };

  const loadPublicPortfolio = async () => {
    if (!tradesmanId.trim()) {
      append("Enter tradesman user id (UUID from /me).");
      return;
    }
    const res = await fetch(`${base}/api/tradesmen/${tradesmanId.trim()}/portfolio`);
    const text = await res.text();
    append(`public portfolio ${res.status}: ${text}`);
  };

  const loadPublicProfile = async () => {
    if (!tradesmanId.trim()) {
      append("Enter tradesman user id (UUID from /me).");
      return;
    }
    const res = await fetch(`${base}/api/tradesmen/${tradesmanId.trim()}`);
    const text = await res.text();
    append(`GET profile ${res.status}: ${text}`);
    try {
      const j = JSON.parse(text) as { profile?: { bio?: string; tradeCategories?: string[] } };
      if (j.profile?.bio !== undefined) setProfileBio(j.profile.bio);
      if (j.profile?.tradeCategories?.length) {
        setTradeCategories(j.profile.tradeCategories.join(", "));
      }
    } catch {
      /* ignore */
    }
  };

  const saveProfile = async () => {
    if (!tradesmanId.trim()) {
      append("Enter tradesman user id (must match logged-in tradesman).");
      return;
    }
    const cats = tradeCategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch(`${base}/api/tradesmen/${tradesmanId.trim()}/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio: profileBio,
        tradeCategories: cats,
        regionConfig: { cities: ["Dublin"], radiusKm: 40 },
      }),
    });
    const text = await res.text();
    append(`PUT profile ${res.status}: ${text}`);
  };

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <section className="mt-8 w-full max-w-md rounded-xl border border-neutral-200 p-4 text-left dark:border-neutral-800">
      <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Dev portfolio (tradesman session)
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        Register/login as <strong>tradesman</strong>, create a project, then choose an image. Images are
        compressed in the browser before upload (max 5MB server cap; jpeg/png/webp/avif).
      </p>
      <label className="mt-3 block text-xs">
        Project title
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="mt-2 block text-xs">
        Description
        <textarea
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="mt-2 rounded bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
        onClick={() => void createProject()}
      >
        Create project
      </button>
      <label className="mt-3 block text-xs">
        Project id (filled after create)
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
      </label>
      <label className="mt-2 block text-xs">
        Image file
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="mt-1 block w-full text-xs"
          onChange={(e) => void uploadImage(e)}
        />
      </label>
      <label className="mt-4 block text-xs">
        Tradesman user id (for public GET)
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
          value={tradesmanId}
          onChange={(e) => setTradesmanId(e.target.value)}
          placeholder="uuid"
        />
      </label>
      <button
        type="button"
        className="mt-2 rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
        onClick={() => void loadPublicPortfolio()}
      >
        GET public portfolio
      </button>
      <label className="mt-4 block text-xs">
        Profile bio (PUT)
        <textarea
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          rows={2}
          value={profileBio}
          onChange={(e) => setProfileBio(e.target.value)}
        />
      </label>
      <label className="mt-2 block text-xs">
        Trade categories (comma-separated)
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={tradeCategories}
          onChange={(e) => setTradeCategories(e.target.value)}
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void loadPublicProfile()}
        >
          GET public profile
        </button>
        <button
          type="button"
          className="rounded bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
          onClick={() => void saveProfile()}
        >
          Save profile
        </button>
      </div>
      <pre className="mt-3 max-h-48 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-neutral-100">
        {log.trim() || "…"}
      </pre>
    </section>
  );
}
