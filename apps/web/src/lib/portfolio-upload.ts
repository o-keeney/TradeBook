import { apiFetch } from "@/lib/api";
import { compressImageForUpload } from "@/lib/compress-image";

export type PendingPhoto = {
  id: string;
  file: File;
  caption: string;
  previewUrl: string;
};

export function revokePendingList(items: PendingPhoto[]) {
  for (const p of items) {
    URL.revokeObjectURL(p.previewUrl);
  }
}

export async function postPortfolioProjectImage(
  projectId: string,
  file: File,
  caption: string,
  sortOrder: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const toUpload = await compressImageForUpload(file);
  const fd = new FormData();
  fd.append("file", toUpload);
  if (caption.trim()) {
    fd.append("description", caption.trim().slice(0, 500));
  }
  fd.append("sortOrder", String(sortOrder));
  const res = await apiFetch(`/api/portfolio/projects/${projectId}/images`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, message: t.slice(0, 200) };
  }
  return { ok: true };
}
