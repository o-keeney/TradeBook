"use client";

/**
 * Keyboard-first skip link: moves focus to `#main-content` (see root layout).
 */
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById("main-content");
        el?.focus({ preventScroll: true });
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      Skip to main content
    </a>
  );
}
