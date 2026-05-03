"use client";
import { useState, useEffect } from "react";

export type Theme = "dark" | "light";

export function useAdminTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    const value = theme === "dark" ? "dark" : "light";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", value);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const isDark = theme === "dark";

  return { theme, setTheme, toggleTheme, isDark };
}
