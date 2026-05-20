"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  type BackgroundThemeId,
  getStoredBackgroundTheme,
  setStoredBackgroundTheme,
} from "@/lib/background-theme";

type BackgroundThemeContextValue = {
  backgroundTheme: BackgroundThemeId;
  setBackgroundTheme: (id: BackgroundThemeId) => void;
};

const BackgroundThemeContext = createContext<BackgroundThemeContextValue | null>(null);

export function useBackgroundTheme() {
  const ctx = useContext(BackgroundThemeContext);
  if (!ctx) throw new Error("useBackgroundTheme must be used within BackgroundThemeProvider");
  return ctx;
}

export function BackgroundThemeProvider({ children }: { children: React.ReactNode }) {
  const [backgroundTheme, setState] = useState<BackgroundThemeId>("zinc");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(getStoredBackgroundTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.body.setAttribute("data-bg", backgroundTheme);
  }, [mounted, backgroundTheme]);

  const setBackgroundTheme = useCallback((id: BackgroundThemeId) => {
    setStoredBackgroundTheme(id);
    setState(id);
    document.body.setAttribute("data-bg", id);
  }, []);

  return (
    <BackgroundThemeContext.Provider value={{ backgroundTheme, setBackgroundTheme }}>
      {children}
    </BackgroundThemeContext.Provider>
  );
}
