import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest, ApiError } from "@/constants/Api";
import type { Admin } from "@/constants/ChurchTypes";

const TOKEN_KEY = "admin.token";

type AuthContextValue = {
  admin: Admin | null;
  token: string | null;
  /** False until the saved session has been checked. */
  ready: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetches the signed-in admin (e.g. after their church changes). */
  refresh: () => Promise<void>;
  setAdmin: (admin: Admin) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(async () => {
    setAdmin(null);
    setToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(console.warn);
  }, []);

  const loadAdmin = useCallback(
    async (savedToken: string) => {
      try {
        const json = await apiRequest<{ admin: Admin }>("/auth/me", {
          adminToken: savedToken,
        });
        setToken(savedToken);
        setAdmin(json.admin);
      } catch (error) {
        // Only drop the session when the server rejects it, not when offline.
        if (error instanceof ApiError && error.status === 401) {
          await clearSession();
        } else {
          console.warn(error);
        }
      }
    },
    [clearSession]
  );

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((savedToken) => (savedToken ? loadAdmin(savedToken) : undefined))
      .catch(console.warn)
      .finally(() => setReady(true));
  }, [loadAdmin]);

  const signIn = useCallback(async (username: string, password: string) => {
    const json = await apiRequest<{ token: string; admin: Admin }>("/auth/login", {
      method: "POST",
      body: { username: username.trim(), password },
    });
    await SecureStore.setItemAsync(TOKEN_KEY, json.token);
    setToken(json.token);
    setAdmin(json.admin);
  }, []);

  const refresh = useCallback(async () => {
    if (token) {
      await loadAdmin(token);
    }
  }, [loadAdmin, token]);

  const value = useMemo(
    () => ({ admin, token, ready, signIn, signOut: clearSession, refresh, setAdmin }),
    [admin, token, ready, signIn, clearSession, refresh]
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
