import imageCompression from "browser-image-compression";

export type CompressImageOptions = {
  /** Target max edge length in pixels (width or height). */
  maxWidthOrHeight?: number;
  /** Soft cap on output file size (library may iterate quality to approach this). */
  maxSizeMB?: number;
  /** JPEG/WebP quality hint (0–1). Lower = smaller files. */
  initialQuality?: number;
};

const DEFAULTS: Required<CompressImageOptions> = {
  maxWidthOrHeight: 1920,
  maxSizeMB: 1.2,
  initialQuality: 0.82,
};

/**
 * Shrinks photos before upload (resize + re-compress). Falls back to the original file on failure.
 * Cloudflare Workers are a poor fit for heavy image codecs; doing this in the browser matches the product spec.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const maxWidthOrHeight = options.maxWidthOrHeight ?? DEFAULTS.maxWidthOrHeight;
  const maxSizeMB = options.maxSizeMB ?? DEFAULTS.maxSizeMB;
  const initialQuality = options.initialQuality ?? DEFAULTS.initialQuality;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      initialQuality,
    });

    const blob: Blob = compressed;
    const mime = blob.type || file.type;
    const name = compressedFileName(file.name, mime);

    return new File([blob], name, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function compressedFileName(originalName: string, mime: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  if (mime.includes("webp")) return `${base}.webp`;
  if (mime.includes("png")) return `${base}.png`;
  if (mime.includes("jpeg") || mime.includes("jpg")) return `${base}.jpg`;
  return originalName;
}
