import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { portfolioProjectImages, portfolioProjects } from "../db/schema";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import { requireTradesman } from "../middleware/tradesman";
import { requireUser } from "../middleware/session";

/** Hard cap after client-side compression (see `apps/web/src/lib/compress-image.ts`). */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(20_000).optional().default(""),
  sortOrder: z.number().int().optional(),
});

const patchProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20_000).optional(),
  sortOrder: z.number().int().optional(),
});

const patchImageSchema = z.object({
  caption: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const manage = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .use(requireTradesman)
  .get("/projects", async (c) => {
    const user = c.get("user");
    const db = createDb(c.env.DB);
    const rows = await db
      .select()
      .from(portfolioProjects)
      .where(eq(portfolioProjects.userId, user.id))
      .orderBy(asc(portfolioProjects.sortOrder), asc(portfolioProjects.createdAt));
    return c.json({ projects: rows });
  })
  .post("/projects", async (c) => {
    const user = c.get("user");
    let body: z.infer<typeof createProjectSchema>;
    try {
      body = createProjectSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          { error: { code: "validation_error", details: e.flatten() } },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    const now = new Date();
    await db.insert(portfolioProjects).values({
      id,
      userId: user.id,
      title: body.title,
      description: body.description ?? "",
      sortOrder: body.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    const [row] = await db
      .select()
      .from(portfolioProjects)
      .where(eq(portfolioProjects.id, id));
    return c.json({ project: row }, 201);
  })
  .get("/projects/:projectId", async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("projectId");
    const db = createDb(c.env.DB);
    const [project] = await db
      .select()
      .from(portfolioProjects)
      .where(
        and(
          eq(portfolioProjects.id, projectId),
          eq(portfolioProjects.userId, user.id),
        ),
      );

    if (!project) {
      return c.json({ error: { code: "not_found", message: "Project not found" } }, 404);
    }

    const images = await db
      .select()
      .from(portfolioProjectImages)
      .where(eq(portfolioProjectImages.projectId, projectId))
      .orderBy(
        asc(portfolioProjectImages.sortOrder),
        asc(portfolioProjectImages.createdAt),
      );

    const origin = new URL(c.req.url).origin;
    return c.json({
      project,
      images: images.map((img) => ({
        id: img.id,
        caption: img.caption,
        sortOrder: img.sortOrder,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        createdAt: img.createdAt,
        url: `${origin}/api/portfolio/images/${img.id}/file`,
      })),
    });
  })
  .patch("/projects/:projectId", async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("projectId");
    let body: z.infer<typeof patchProjectSchema>;
    try {
      body = patchProjectSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          { error: { code: "validation_error", details: e.flatten() } },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const [existing] = await db
      .select()
      .from(portfolioProjects)
      .where(
        and(
          eq(portfolioProjects.id, projectId),
          eq(portfolioProjects.userId, user.id),
        ),
      );

    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Project not found" } }, 404);
    }

    const now = new Date();
    await db
      .update(portfolioProjects)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        updatedAt: now,
      })
      .where(eq(portfolioProjects.id, projectId));

    const [row] = await db
      .select()
      .from(portfolioProjects)
      .where(eq(portfolioProjects.id, projectId));
    return c.json({ project: row });
  })
  .delete("/projects/:projectId", async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("projectId");
    const bucket = c.env.MEDIA_BUCKET;
    const db = createDb(c.env.DB);

    const [existing] = await db
      .select()
      .from(portfolioProjects)
      .where(
        and(
          eq(portfolioProjects.id, projectId),
          eq(portfolioProjects.userId, user.id),
        ),
      );

    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Project not found" } }, 404);
    }

    const imgs = await db
      .select()
      .from(portfolioProjectImages)
      .where(eq(portfolioProjectImages.projectId, projectId));

    if (bucket) {
      for (const im of imgs) {
        await bucket.delete(im.r2Key);
      }
    }

    await db.delete(portfolioProjects).where(eq(portfolioProjects.id, projectId));
    return c.body(null, 204);
  })
  .post("/projects/:projectId/images", async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("projectId");
    const bucket = c.env.MEDIA_BUCKET;
    if (!bucket) {
      return c.json(
        { error: { code: "service_unavailable", message: "Media storage not configured" } },
        503,
      );
    }

    const db = createDb(c.env.DB);
    const [project] = await db
      .select()
      .from(portfolioProjects)
      .where(
        and(
          eq(portfolioProjects.id, projectId),
          eq(portfolioProjects.userId, user.id),
        ),
      );

    if (!project) {
      return c.json({ error: { code: "not_found", message: "Project not found" } }, 404);
    }

    const form = await c.req.formData();
    const raw = form.get("file");
    if (raw === null || typeof raw === "string") {
      return c.json(
        { error: { code: "validation_error", message: "Expected multipart field \"file\"" } },
        400,
      );
    }
    const file = raw as Blob & { name?: string };

    const caption = form.get("caption");
    const sortRaw = form.get("sortOrder");
    const captionStr =
      typeof caption === "string" && caption.length > 0 ? caption.slice(0, 500) : null;
    const sortOrder =
      typeof sortRaw === "string" && sortRaw !== "" ? Number.parseInt(sortRaw, 10) : 0;

    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      return c.json(
        {
          error: {
            code: "validation_error",
            message: `Unsupported type. Use: ${[...ALLOWED_IMAGE_MIME].join(", ")}`,
          },
        },
        400,
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return c.json(
        { error: { code: "validation_error", message: "File exceeds 5MB limit" } },
        400,
      );
    }

    const ext = extensionFromMime(file.type);
    const imageId = crypto.randomUUID();
    const safeName = sanitizeFilename(
      typeof file.name === "string" ? file.name : "image",
    );
    const r2Key = `portfolio/${user.id}/${projectId}/${imageId}-${safeName}${ext}`;

    const buf = await file.arrayBuffer();
    await bucket.put(r2Key, buf, {
      httpMetadata: { contentType: file.type },
    });

    const now = new Date();
    await db.insert(portfolioProjectImages).values({
      id: imageId,
      projectId,
      r2Key,
      caption: captionStr,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      mimeType: file.type,
      sizeBytes: file.size,
      createdAt: now,
    });

    await db
      .update(portfolioProjects)
      .set({ updatedAt: now })
      .where(eq(portfolioProjects.id, projectId));

    const [row] = await db
      .select()
      .from(portfolioProjectImages)
      .where(eq(portfolioProjectImages.id, imageId));

    const origin = new URL(c.req.url).origin;
    return c.json(
      {
        image: row
          ? {
              ...row,
              url: `${origin}/api/portfolio/images/${row.id}/file`,
            }
          : null,
      },
      201,
    );
  })
  .patch("/images/:imageId", async (c) => {
    const user = c.get("user");
    const imageId = c.req.param("imageId");
    let body: z.infer<typeof patchImageSchema>;
    try {
      body = patchImageSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          { error: { code: "validation_error", details: e.flatten() } },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const [img] = await db
      .select({ image: portfolioProjectImages, project: portfolioProjects })
      .from(portfolioProjectImages)
      .innerJoin(
        portfolioProjects,
        eq(portfolioProjectImages.projectId, portfolioProjects.id),
      )
      .where(eq(portfolioProjectImages.id, imageId));

    if (!img || img.project.userId !== user.id) {
      return c.json({ error: { code: "not_found", message: "Image not found" } }, 404);
    }

    const now = new Date();
    await db
      .update(portfolioProjectImages)
      .set({
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      })
      .where(eq(portfolioProjectImages.id, imageId));

    await db
      .update(portfolioProjects)
      .set({ updatedAt: now })
      .where(eq(portfolioProjects.id, img.project.id));

    const [row] = await db
      .select()
      .from(portfolioProjectImages)
      .where(eq(portfolioProjectImages.id, imageId));

    const origin = new URL(c.req.url).origin;
    return c.json({
      image: row
        ? {
            ...row,
            url: `${origin}/api/portfolio/images/${row.id}/file`,
          }
        : null,
    });
  })
  .delete("/images/:imageId", async (c) => {
    const user = c.get("user");
    const imageId = c.req.param("imageId");
    const bucket = c.env.MEDIA_BUCKET;
    const db = createDb(c.env.DB);

    const [img] = await db
      .select({ image: portfolioProjectImages, project: portfolioProjects })
      .from(portfolioProjectImages)
      .innerJoin(
        portfolioProjects,
        eq(portfolioProjectImages.projectId, portfolioProjects.id),
      )
      .where(eq(portfolioProjectImages.id, imageId));

    if (!img || img.project.userId !== user.id) {
      return c.json({ error: { code: "not_found", message: "Image not found" } }, 404);
    }

    if (bucket) {
      await bucket.delete(img.image.r2Key);
    }

    await db
      .delete(portfolioProjectImages)
      .where(eq(portfolioProjectImages.id, imageId));

    await db
      .update(portfolioProjects)
      .set({ updatedAt: new Date() })
      .where(eq(portfolioProjects.id, img.project.id));

    return c.body(null, 204);
  });

export const portfolioManageRoutes = manage;

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "image";
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return "";
  }
}
