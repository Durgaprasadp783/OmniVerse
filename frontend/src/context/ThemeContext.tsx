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

  useEffect(() => {
    const saved = localStorage.getItem("omniverse_mode") as ThemeMode;
    const initialMode: ThemeMode = saved === "dark" ? "dark" : "light";
    setModeState(initialMode);
    
    if (initialMode === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-mode", "light");
    }
    setMounted(true);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("omniverse_mode", newMode);
    if (newMode === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-mode", "light");
    }
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
