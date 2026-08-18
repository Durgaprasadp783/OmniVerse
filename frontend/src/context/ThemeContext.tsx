"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  isDarkMode: boolean;
  toggleDayNight: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  const applyTheme = (newMode: ThemeMode) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (newMode === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-mode", "dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-mode", "light");
      root.style.colorScheme = "light";
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("omniverse_mode") as ThemeMode;
    const initialMode: ThemeMode = saved === "dark" ? "dark" : "light";
    setModeState(initialMode);
    applyTheme(initialMode);
    setMounted(true);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("omniverse_mode", newMode);
    applyTheme(newMode);
  };

  const toggleDayNight = () => {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDarkMode: mode === "dark",
        toggleDayNight,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
