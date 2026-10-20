"use client";

import { Theme } from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

export function AppTheme({ children }: { children: React.ReactNode }) {
  return <Theme theme={neutralTheme}>{children}</Theme>;
}
