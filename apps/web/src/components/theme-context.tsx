"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-storage";

export type ThemeChoice = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  /** Resolved appearance after applying system preference. */
  resolved: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDomClass(theme: ThemeChoice): "light" | "dark" {
  const dark =
    theme === "dark" || (theme === "system" && (typeof window === "undefined" ? false : systemPrefersDark()));
  document.documentElement.classList.toggle("dark", dark);
  return dark ? "dark" : "light";
}

function persistTheme(theme: ThemeChoice) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      const stored = readStoredTheme();
      if (stored !== theme) {
        setThemeState(stored);
        return;
      }
    }
    const r = applyDomClass(theme);
    setResolved(r);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolved(applyDomClass("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
