import type { Db } from "../db/drizzle";
import { notifications } from "../db/schema";

export async function createNotification(
  db: Db,
  opts: {
    userId: string;
    actorUserId?: string | null;
    type: string;
    title: string;
    body?: string | null;
    href?: string | null;
  },
): Promise<void> {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId: opts.userId,
    actorUserId: opts.actorUserId ?? null,
    type: opts.type,
    title: opts.title.trim().slice(0, 200),
    body: opts.body?.trim() ? opts.body.trim().slice(0, 1000) : null,
    href: opts.href?.trim() ? opts.href.trim().slice(0, 512) : null,
    createdAt: new Date(),
  });
}
