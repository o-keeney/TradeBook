import { eq } from "drizzle-orm";
import type { Db } from "../db/drizzle";
import { users, workOrders } from "../db/schema";
import type { Env } from "../env";
import { resolveAppOrigin } from "./app-origin";
import { sendTransactionalEmail } from "./brevo-email";

type WorkOrderRow = typeof workOrders.$inferSelect;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jobUrl(env: Env, workOrderId: string): string {
  const base = resolveAppOrigin(env);
  return `${base}/work-orders/${workOrderId}`;
}

async function userEmail(db: Db, userId: string): Promise<string | null> {
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  return u?.email?.trim() || null;
}

async function displayName(db: Db, userId: string): Promise<string> {
  const [u] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId));
  const f = u?.firstName?.trim() ?? "";
  const l = u?.lastName?.trim() ?? "";
  const full = `${f} ${l}`.trim();
  return full.length > 0 ? full : "A tradesperson";
}

/** Fire-and-forget: log failures only; never throws to callers. */
export function scheduleWorkOrderEmail(
  env: Env,
  fn: () => Promise<void>,
  label: string,
): void {
  void fn().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[work-order-email] ${label} failed`, msg);
  });
}

export async function notifyTradesmanDirectJobAssigned(
  env: Env,
  db: Db,
  wo: WorkOrderRow,
): Promise<void> {
  if (!wo.assignedTradesmanId) return;
  const to = await userEmail(db, wo.assignedTradesmanId);
  if (!to) return;
  const subject = `New direct job: ${wo.title.slice(0, 72)}`;
  const html = `<p>You have been assigned a direct job on Tradebook.</p>
<p><strong>${esc(wo.title)}</strong></p>
<p><a href="${jobUrl(env, wo.id)}">View job</a></p>`;
  await sendTransactionalEmail(env, { to, subject, html });
}

export async function notifyCustomerDirectJobResponse(
  env: Env,
  db: Db,
  wo: WorkOrderRow,
  accepted: boolean,
): Promise<void> {
  const to = await userEmail(db, wo.customerId);
  if (!to) return;
  const subject = accepted
    ? `Job accepted: ${wo.title.slice(0, 72)}`
    : `Job declined: ${wo.title.slice(0, 72)}`;
  const html = `<p>The assigned tradesperson has <strong>${accepted ? "accepted" : "declined"}</strong> your direct job.</p>
<p><strong>${esc(wo.title)}</strong></p>
<p><a href="${jobUrl(env, wo.id)}">View job</a></p>`;
  await sendTransactionalEmail(env, { to, subject, html });
}

export async function notifyCustomerNewBid(
  env: Env,
  db: Db,
  wo: WorkOrderRow,
  bidderId: string,
): Promise<void> {
  const to = await userEmail(db, wo.customerId);
  if (!to) return;
  const who = await displayName(db, bidderId);
  const subject = `New bid on “${wo.title.slice(0, 60)}”`;
  const html = `<p><strong>${esc(who)}</strong> placed a bid on your open job.</p>
<p><strong>${esc(wo.title)}</strong></p>
<p><a href="${jobUrl(env, wo.id)}">Review bids</a></p>`;
  await sendTransactionalEmail(env, { to, subject, html });
}

export async function notifyTradesmanBidAccepted(
  env: Env,
  db: Db,
  wo: WorkOrderRow,
  tradesmanId: string,
): Promise<void> {
  const to = await userEmail(db, tradesmanId);
  if (!to) return;
  const subject = `You won the job: ${wo.title.slice(0, 72)}`;
  const html = `<p>The customer accepted your bid.</p>
<p><strong>${esc(wo.title)}</strong></p>
<p><a href="${jobUrl(env, wo.id)}">Open job</a></p>`;
  await sendTransactionalEmail(env, { to, subject, html });
}

export async function notifyPeerWorkOrderStatus(
  env: Env,
  db: Db,
  wo: WorkOrderRow,
  newStatus: string,
  actorUserId: string,
): Promise<void> {
  const isCustomer = actorUserId === wo.customerId;
  const peerId = isCustomer ? wo.assignedTradesmanId : wo.customerId;
  if (!peerId) return;
  const to = await userEmail(db, peerId);
  if (!to) return;
  const subject = `Job update: ${wo.title.slice(0, 60)} → ${newStatus.replace(/_/g, " ")}`;
  const html = `<p>The status of your job was updated to <strong>${esc(newStatus.replace(/_/g, " "))}</strong>.</p>
<p><strong>${esc(wo.title)}</strong></p>
<p><a href="${jobUrl(env, wo.id)}">Open job</a></p>`;
  await sendTransactionalEmail(env, { to, subject, html });
}
