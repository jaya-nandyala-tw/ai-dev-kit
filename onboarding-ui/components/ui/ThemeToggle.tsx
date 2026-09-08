"use client";

import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "onboarding-ui-theme";

// Reads whatever the no-flash boot script (see app/layout.tsx) already set on <html> — that
// script runs before paint, so by the time this component mounts, data-theme is already
// correct; this just mirrors it into React state for the icon/label.
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage can throw in a locked-down browser context — theme just won't persist.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="mono text-xs tracking-wide flex items-center gap-1.5 shrink-0 hover:opacity-70 transition-opacity"
    >
      <span>{theme === "dark" ? "☀" : "☾"}</span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
