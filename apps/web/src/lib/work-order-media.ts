import { apiFetch } from "@/lib/api";
import { compressImageForUpload } from "@/lib/compress-image";

export async function postWorkOrderJobImage(
  workOrderId: string,
  file: File,
): Promise<{ ok: true; url: string; id: string } | { ok: false; message: string }> {
  const toUpload = await compressImageForUpload(file);
  const fd = new FormData();
  fd.append("file", toUpload);
  const res = await apiFetch(`/api/work-orders/${workOrderId}/media`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = t.slice(0, 200);
    try {
      const j = JSON.parse(t) as { error?: { message?: string } };
      if (j.error?.message) msg = j.error.message;
    } catch {
      /* ignore */
    }
    return { ok: false, message: msg };
  }
  const j = (await res.json()) as { media?: { url: string; id: string } };
  const url = j.media?.url;
  const id = j.media?.id;
  if (!url || !id) return { ok: false, message: "Invalid response from server." };
  return { ok: true, url, id };
}
