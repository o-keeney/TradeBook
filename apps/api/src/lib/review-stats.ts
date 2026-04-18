import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/drizzle";
import { reviews, tradesmenProfiles } from "../db/schema";

/** Recompute `avg_rating` and `review_count` on `tradesmen_profiles` from all reviews for that tradesman. */
export async function refreshTradesmanReviewAggregate(db: Db, tradesmanId: string): Promise<void> {
  const [row] = await db
    .select({
      avgRating: sql<number | null>`avg(${reviews.rating})`,
      n: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(eq(reviews.tradesmanId, tradesmanId));

  const reviewCount = Number(row?.n ?? 0);
  const rawAvg = row?.avgRating;
  const avgRating =
    reviewCount > 0 && rawAvg != null && Number.isFinite(Number(rawAvg)) ? Number(rawAvg) : null;

  await db
    .update(tradesmenProfiles)
    .set({
      avgRating,
      reviewCount,
      updatedAt: new Date(),
    })
    .where(eq(tradesmenProfiles.userId, tradesmanId));
}
