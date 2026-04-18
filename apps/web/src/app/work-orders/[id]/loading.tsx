export default function WorkOrderDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:pt-10" aria-busy="true" aria-label="Loading job">
      <div className="sr-only">Loading job</div>
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-36 rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/70" />
        <div className="h-24 rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50" />
        <div className="h-40 rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50" />
      </div>
    </div>
  );
}
