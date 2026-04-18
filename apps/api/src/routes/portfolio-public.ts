import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/drizzle";
import { portfolioProjectImages, portfolioProjects } from "../db/schema";
import type { Env } from "../env";

export const publicPortfolioRoutes = new Hono<{ Bindings: Env }>()
  .get("/tradesmen/:userId/portfolio", async (c) => {
    const userId = c.req.param("userId");
    const db = createDb(c.env.DB);

    const projects = await db
      .select()
      .from(portfolioProjects)
      .where(eq(portfolioProjects.userId, userId))
      .orderBy(asc(portfolioProjects.sortOrder), asc(portfolioProjects.createdAt));

    const projectIds = projects.map((p) => p.id);

    const allImages =
      projectIds.length > 0
        ? await db
            .select()
            .from(portfolioProjectImages)
            .where(inArray(portfolioProjectImages.projectId, projectIds))
            .orderBy(
              asc(portfolioProjectImages.projectId),
              asc(portfolioProjectImages.sortOrder),
              asc(portfolioProjectImages.createdAt),
            )
        : [];

    const imagesByProject = new Map<
      string,
      {
        id: string;
        caption: string | null;
        sortOrder: number;
        mimeType: string;
        url: string;
      }[]
    >();

    const origin = new URL(c.req.url).origin;

    for (const img of allImages) {
      const list = imagesByProject.get(img.projectId) ?? [];
      list.push({
        id: img.id,
        caption: img.caption,
        sortOrder: img.sortOrder,
        mimeType: img.mimeType,
        url: `${origin}/api/portfolio/images/${img.id}/file`,
      });
      imagesByProject.set(img.projectId, list);
    }

    return c.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        projectDate: p.projectDate,
        durationText: p.durationText,
        budgetText: p.budgetText,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        images: imagesByProject.get(p.id) ?? [],
      })),
    });
  })
  .get("/portfolio/images/:imageId/file", async (c) => {
    const imageId = c.req.param("imageId");
    const bucket = c.env.MEDIA_BUCKET;
    if (!bucket) {
      return c.json(
        { error: { code: "service_unavailable", message: "Media storage not configured" } },
        503,
      );
    }

    const db = createDb(c.env.DB);
    const [img] = await db
      .select()
      .from(portfolioProjectImages)
      .where(eq(portfolioProjectImages.id, imageId));

    if (!img) {
      return c.json({ error: { code: "not_found", message: "Image not found" } }, 404);
    }

    const obj = await bucket.get(img.r2Key);
    if (!obj) {
      return c.json({ error: { code: "not_found", message: "Object missing" } }, 404);
    }

    const ct = obj.httpMetadata?.contentType ?? img.mimeType;
    return new Response(obj.body, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
      },
    });
  });
