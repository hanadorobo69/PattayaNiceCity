"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeVariant = "nicecity-dark" | "nicecity-light";

interface ThemeContextType {
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "nicecity-dark",
  setTheme: () => {},
  mounted: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeVariant>("nicecity-dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("pnc-theme"); } catch {}
    const initial = saved === "nicecity-light" ? "nicecity-light" : "nicecity-dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  function setTheme(t: ThemeVariant) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("pnc-theme", t); } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
