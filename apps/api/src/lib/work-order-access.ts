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
    wo.status === "open_bidding"
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
