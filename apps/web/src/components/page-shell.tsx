import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** `wide` uses a roomier max width for grids (e.g. dashboard). */
  maxWidth?: "default" | "wide";
};

export function PageShell({
  title,
  description,
  children,
  maxWidth = "default",
}: PageShellProps) {
  const widthClass =
    maxWidth === "wide"
      ? "mx-auto max-w-5xl px-4 py-10 sm:py-12"
      : "mx-auto max-w-3xl px-4 py-10 sm:py-12";

  return (
    <div className={widthClass}>
      <header className="mb-8 rounded-2xl border border-[var(--border)]/70 bg-[var(--surface)]/75 px-5 py-5 shadow-[0_8px_28px_rgb(15_23_42_/0.05)] backdrop-blur sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
