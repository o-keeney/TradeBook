/**
 * Tasteful job-tracking colours: green = done, yellow = waiting / pending, red = closed negative,
 * neutral = work underway (accepted / in progress).
 */
export type WorkOrderTrackTone = "completed" | "pending" | "issue" | "active";

export function workOrderTrackTone(status: string): WorkOrderTrackTone {
  switch (status) {
    case "completed":
      return "completed";
    case "cancelled":
    case "declined":
    case "customer_rejected":
      return "issue";
    case "pending":
    case "open_bidding":
    case "quotes_submitted":
    case "awaiting_info":
      return "pending";
    case "accepted":
    case "in_progress":
      return "active";
    default:
      return "active";
  }
}

const PILL: Record<WorkOrderTrackTone, string> = {
  completed:
    "border-emerald-200/90 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-900/5 dark:border-emerald-900/50 dark:bg-emerald-950/45 dark:text-emerald-100 dark:shadow-emerald-950/20",
  pending:
    "border-amber-200/90 bg-amber-50 text-amber-950 shadow-sm shadow-amber-900/5 dark:border-amber-900/50 dark:bg-amber-950/45 dark:text-amber-100 dark:shadow-amber-950/20",
  issue:
    "border-rose-200/90 bg-rose-50 text-rose-950 shadow-sm shadow-rose-900/5 dark:border-rose-900/50 dark:bg-rose-950/45 dark:text-rose-100 dark:shadow-rose-950/20",
  active:
    "border-slate-200/90 bg-slate-50 text-slate-800 shadow-sm shadow-slate-900/5 dark:border-slate-600 dark:bg-slate-900/55 dark:text-slate-100 dark:shadow-black/20",
};

const BANNER: Record<WorkOrderTrackTone, string> = {
  completed:
    "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-emerald-50/80 text-emerald-950 dark:border-emerald-900/45 dark:from-emerald-950/50 dark:to-emerald-950/35 dark:text-emerald-100",
  pending:
    "border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-50/80 text-amber-950 dark:border-amber-900/45 dark:from-amber-950/50 dark:to-amber-950/35 dark:text-amber-100",
  issue:
    "border-rose-200/90 bg-gradient-to-br from-rose-50 to-rose-50/80 text-rose-950 dark:border-rose-900/45 dark:from-rose-950/50 dark:to-rose-950/35 dark:text-rose-100",
  active:
    "border-slate-200/90 bg-gradient-to-br from-slate-50 to-white text-slate-900 dark:border-slate-700 dark:from-slate-900/60 dark:to-slate-950/80 dark:text-slate-100",
};

/** Top accent on list cards for quick scanning (works with rounded-2xl). */
const CARD_TOP: Record<WorkOrderTrackTone, string> = {
  completed: "border-t-[3px] border-t-emerald-500/90",
  pending: "border-t-[3px] border-t-amber-400/95",
  issue: "border-t-[3px] border-t-rose-500/90",
  active: "border-t-[3px] border-t-slate-300 dark:border-t-slate-600",
};

export function workOrderStatusPillClass(status: string): string {
  return PILL[workOrderTrackTone(status)];
}

export function workOrderStatusBannerClass(status: string): string {
  return BANNER[workOrderTrackTone(status)];
}

export function workOrderListCardAccentClass(status: string): string {
  return CARD_TOP[workOrderTrackTone(status)];
}

export function humanWorkOrderStatus(status: string): string {
  return status.replace(/_/g, " ");
}
