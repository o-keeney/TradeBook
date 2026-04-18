export default function WorkOrdersLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12" aria-busy="true" aria-label="Loading work orders">
      <div className="sr-only">Loading work orders</div>
      <div className="animate-pulse space-y-6">
        <div className="h-9 w-48 max-w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-52 rounded-2xl border border-neutral-200 bg-neutral-100/80 dark:border-neutral-800 dark:bg-neutral-900/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
