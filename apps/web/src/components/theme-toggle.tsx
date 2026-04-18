"use client";

import { useTheme, type ThemeChoice } from "@/components/theme-context";

const options: { value: ThemeChoice; label: string; title: string }[] = [
  { value: "light", label: "Light", title: "Modern light (indigo)" },
  { value: "dark", label: "Dark", title: "Classic dark (saved scheme)" },
  { value: "system", label: "Auto", title: "Match system" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-sm"
      role="group"
      aria-label="Colour theme"
    >
      {options.map(({ value, label, title }) => (
        <button
          key={value}
          type="button"
          title={title}
          onClick={() => setTheme(value)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            theme === value
              ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
              : "text-[var(--muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-fg)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
