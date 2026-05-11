"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import { authApi } from "@/features/auth/auth-api";
import { tokenStorage } from "@/shared/api/token-storage";

type AuthContextValue = {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => tokenStorage.get());

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: Boolean(accessToken),
      async login(email: string, password: string) {
        const response = await authApi.login({ email, password });
        tokenStorage.set(response.accessToken);
        setAccessToken(response.accessToken);
      },
      async logout() {
        try {
          await authApi.logout();
        } finally {
          tokenStorage.clear();
          setAccessToken(null);
        }
      },
    }),
    [accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
