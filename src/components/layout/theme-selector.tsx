"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeSelector() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  const isDark = theme !== "nicecity-light";

  return (
    <button
      onClick={() => setTheme(isDark ? "nicecity-light" : "nicecity-dark")}
      className="h-9 w-9 rounded-lg flex items-center justify-center text-[#e8a840] hover:text-[#3db8a0] hover:bg-[rgba(232,168,64,0.12)] transition-colors"
      title={isDark ? "Switch to Day mode" : "Switch to Night mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
