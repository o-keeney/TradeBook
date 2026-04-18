export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12" aria-busy="true" aria-label="Loading messages">
      <div className="sr-only">Loading messages</div>
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-40 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50"
          />
        ))}
      </div>
    </div>
  );
}
