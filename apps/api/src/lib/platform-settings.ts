import { eq } from "drizzle-orm";
import type { Db } from "../db/drizzle";
import { platformSettings } from "../db/schema";

export const TRADESMAN_MONTHLY_EUR_KEY = "tradesman_monthly_eur" as const;

const DEFAULT_TRADESMAN_MONTHLY_EUR = 30;

export function parseTradesmanMonthlyEuros(raw: string | undefined | null): number {
  const n = Number.parseFloat(raw ?? "");
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TRADESMAN_MONTHLY_EUR;
}

export async function getTradesmanMonthlyEuros(db: Db): Promise<number> {
  const row = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, TRADESMAN_MONTHLY_EUR_KEY))
    .get();
  return parseTradesmanMonthlyEuros(row?.value);
}

export async function setTradesmanMonthlyEuros(db: Db, euros: number): Promise<void> {
  const str = String(euros);
  const now = new Date();
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, TRADESMAN_MONTHLY_EUR_KEY))
    .get();
  if (existing) {
    await db
      .update(platformSettings)
      .set({ value: str, updatedAt: now })
      .where(eq(platformSettings.key, TRADESMAN_MONTHLY_EUR_KEY));
  } else {
    await db.insert(platformSettings).values({
      key: TRADESMAN_MONTHLY_EUR_KEY,
      value: str,
      updatedAt: now,
    });
  }
}
