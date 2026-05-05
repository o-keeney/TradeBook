import { eq } from "drizzle-orm";
import type { Db } from "../db/drizzle";
import { users, workOrders } from "../db/schema";
import type { Env } from "../env";
import { resolveAppOrigin } from "./app-origin";
import { sendTransactionalEmail } from "./brevo-email";

type WorkOrderRow = typeof workOrders.$inferSelect;
type AppointmentForEmail = {
  id: string;
  title: string;
  startsAt: Date | number | string;
  endsAt: Date | number | string;
  notes?: string | null;
};

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

function formatWhenRange(startsAt: Date | number | string, endsAt: Date | number | string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "Scheduled time unavailable";
  const date = s.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const from = s.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const to = e.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${from} to ${to}`;
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
  const budgetTrim = wo.budgetText?.trim();
  const budgetLine = budgetTrim ? `<p><strong>Budget</strong> ${esc(budgetTrim)}</p>` : "";
  const html = `<p>You have been assigned a direct job on Tradebook.</p>
<p><strong>${esc(wo.title)}</strong></p>
${budgetLine}
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

export async function notifyWorkOrderAppointmentReminder(
  env: Env,
  db: Db,
  wo: WorkOrderRow,
  appt: AppointmentForEmail,
  mode: "scheduled" | "manual",
): Promise<void> {
  if (!wo.assignedTradesmanId) return;
  const recipients = [wo.customerId, wo.assignedTradesmanId];
  const whenLine = formatWhenRange(appt.startsAt, appt.endsAt);
  const subjectPrefix = mode === "manual" ? "Reminder" : "Appointment scheduled";
  const subject = `${subjectPrefix}: ${appt.title.slice(0, 72)}`;
  const notesLine = appt.notes?.trim()
    ? `<p><strong>Notes:</strong> ${esc(appt.notes.trim())}</p>`
    : "";
  const html = `<p><strong>${esc(appt.title)}</strong></p>
<p>${esc(whenLine)}</p>
${notesLine}
<p>Job: ${esc(wo.title)}</p>
<p><a href="${jobUrl(env, wo.id)}">Open work order</a></p>`;
  for (const userId of recipients) {
    const to = await userEmail(db, userId);
    if (!to) continue;
    await sendTransactionalEmail(env, { to, subject, html });
  }
}
