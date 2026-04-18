export default function MessageThreadLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12" aria-busy="true" aria-label="Loading conversation">
      <div className="sr-only">Loading conversation</div>
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-56 max-w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-8 min-h-[12rem] rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40" />
      </div>
    </div>
  );
}
