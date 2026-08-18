"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeSelectorProps {
  variant?: "dropdown" | "floating" | "inline";
}

export default function ThemeSelector({ variant = "floating" }: ThemeSelectorProps) {
  const { isDarkMode, toggleDayNight } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleDayNight}
      aria-label="Toggle Day / Night Mode"
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs transition-all cursor-pointer"
    >
      {isDarkMode ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span>Day Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-purple-600" />
          <span>Night Mode</span>
        </>
      )}
    </button>
  );
}
