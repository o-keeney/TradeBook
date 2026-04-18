import { apiFetch } from "@/lib/api";
import { compressImageForUpload } from "@/lib/compress-image";

export async function postTradesmanProfilePhoto(
  tradesmanUserId: string,
  file: File,
): Promise<
  { ok: true; profilePhotoUrl: string | null } | { ok: false; message: string }
> {
  const toUpload = await compressImageForUpload(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 1,
    initialQuality: 0.82,
  });
  const fd = new FormData();
  fd.append("file", toUpload);
  const res = await apiFetch(
    `/api/tradesmen/${encodeURIComponent(tradesmanUserId)}/profile-photo`,
    {
      method: "POST",
      body: fd,
    },
  );
  if (!res.ok) {
    const t = await res.text();
    let message = t.slice(0, 200);
    try {
      const j = JSON.parse(t) as { error?: { message?: string } };
      if (j.error?.message) message = j.error.message;
    } catch {
      /* keep slice */
    }
    return { ok: false, message };
  }
  const j = (await res.json()) as { profile?: { profilePhotoUrl?: string | null } };
  const profilePhotoUrl = j.profile?.profilePhotoUrl?.trim() ?? null;
  return { ok: true, profilePhotoUrl };
}
