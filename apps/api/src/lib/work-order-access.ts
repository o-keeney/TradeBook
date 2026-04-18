import type { workOrders } from "../db/schema";
import type { UserRow } from "./public-user";

export type WorkOrderRow = typeof workOrders.$inferSelect;

/** Same visibility as GET /api/work-orders/:id */
export function canViewWorkOrder(user: UserRow, wo: WorkOrderRow): boolean {
  if (wo.customerId === user.id) return true;
  if (wo.assignedTradesmanId === user.id) return true;
  return (
    user.role === "tradesman" &&
    wo.submissionType === "open_bid" &&
    (wo.status === "open_bidding" || wo.status === "quotes_submitted")
  );
}

/** Customer or assigned tradesman once a job is assigned (not marketplace browsing). */
export function isJobParticipant(user: UserRow, wo: WorkOrderRow): boolean {
  return wo.customerId === user.id || wo.assignedTradesmanId === user.id;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  accepted: ["in_progress", "cancelled"],
  in_progress: ["awaiting_info", "completed", "cancelled"],
  awaiting_info: ["in_progress", "completed", "cancelled"],
};

export function canTransitionStatus(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Customer during open quote phase, or assigned tradesman during active job. */
export function canUploadJobMedia(user: UserRow, wo: WorkOrderRow): boolean {
  if (
    wo.customerId === user.id &&
    (wo.status === "open_bidding" || wo.status === "quotes_submitted")
  ) {
    return true;
  }
  if (
    wo.assignedTradesmanId === user.id &&
    ["accepted", "in_progress", "awaiting_info"].includes(wo.status)
  ) {
    return true;
  }
  return false;
}

/** Assigned tradesman only, while the job is live (not bidding-only). */
export function canMutatePlanner(user: UserRow, wo: WorkOrderRow): boolean {
  return (
    user.role === "tradesman" &&
    wo.assignedTradesmanId === user.id &&
    ["accepted", "in_progress", "awaiting_info"].includes(wo.status)
  );
}
