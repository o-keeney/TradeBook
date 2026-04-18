import { eq } from "drizzle-orm";
import { createDb } from "../db/drizzle";
import { conversations, workOrders } from "../db/schema";
import type { UserRow } from "./public-user";
import { canReadJobConversation, canViewWorkOrder } from "./work-order-access";

export async function loadWorkOrderForUser(
  db: ReturnType<typeof createDb>,
  workOrderId: string,
  user: UserRow,
) {
  const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, workOrderId));
  if (!wo || !canViewWorkOrder(user, wo)) return null;
  return wo;
}

export async function ensureConversationRow(
  db: ReturnType<typeof createDb>,
  workOrderId: string,
  user: UserRow,
) {
  const wo = await loadWorkOrderForUser(db, workOrderId, user);
  if (!wo || !canReadJobConversation(user, wo)) return { wo: null as null, conversation: null as null };

  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.workOrderId, workOrderId));
  if (existing) return { wo, conversation: existing };

  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(conversations).values({
    id,
    workOrderId,
    createdAt: now,
    updatedAt: now,
  });
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
  return { wo, conversation: row ?? null };
}

export async function loadConversationForUser(
  db: ReturnType<typeof createDb>,
  conversationId: string,
  user: UserRow,
) {
  const [c] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!c) return { conversation: null as null, wo: null as null };
  const wo = await loadWorkOrderForUser(db, c.workOrderId, user);
  if (!wo || !canReadJobConversation(user, wo)) return { conversation: null as null, wo: null as null };
  return { conversation: c, wo };
}
