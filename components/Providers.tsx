"use client";

import { SessionProvider } from "next-auth/react";
import { BackgroundThemeProvider } from "@/components/BackgroundThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BackgroundThemeProvider>{children}</BackgroundThemeProvider>
    </SessionProvider>
  );
}
