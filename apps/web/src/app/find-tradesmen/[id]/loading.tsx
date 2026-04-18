export default function TradesmanProfileLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12" aria-busy="true" aria-label="Loading profile">
      <div className="sr-only">Loading profile</div>
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-24 w-24 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-6 w-48 max-w-full rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-full max-w-md rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-24 w-full rounded-xl bg-neutral-100 dark:bg-neutral-900/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
