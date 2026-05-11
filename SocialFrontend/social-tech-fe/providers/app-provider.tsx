"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/providers/auth-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
