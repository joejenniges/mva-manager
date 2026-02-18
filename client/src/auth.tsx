import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserInfo, SessionResponse } from "./types";
import { api, getStoredToken, setStoredToken, clearStoredToken } from "./api";

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  loading: boolean;
  login: (googleToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

// WHY: Dev bypass skips Google OAuth which doesn't work in automated/DevTools
// browsers. Only active when VITE_DEV_AUTH_BYPASS=true in dev mode.
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true";
const DEV_USER: UserInfo = {
  id: "dev-user",
  email: "user@example.com",
  name: "Joe Jenniges",
  avatarUrl: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    DEV_AUTH_BYPASS ? "dev-token" : getStoredToken()
  );
  const [user, setUser] = useState<UserInfo | null>(() =>
    DEV_AUTH_BYPASS ? DEV_USER : null
  );
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  // Exchange a Google token for a 7-day session token
  const login = useCallback((googleToken: string) => {
    setLoading(true);
    api<SessionResponse>("/api/v1/auth/session", {
      method: "POST",
      token: googleToken,
    })
      .then((session) => {
        setStoredToken(session.token);
        setToken(session.token);
        setUser(session.user);
        setLoading(false);
      })
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
        setLoading(false);
      });
  }, []);

  // On mount (or token change), validate the stored token
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;

    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api<UserInfo>("/api/v1/me", { token })
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
