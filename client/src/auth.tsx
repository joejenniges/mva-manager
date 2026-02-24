import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserInfo, SessionResponse } from "./types";
import { api, ApiError, DEV_AUTH_BYPASS, getStoredToken, setStoredToken, clearStoredToken } from "./api";

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  loading: boolean;
  loginError: string | null;
  login: (googleToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  loading: true,
  loginError: null,
  login: () => {},
  logout: () => {},
});

const DEV_USER_EMAIL = import.meta.env.VITE_DEV_USER_EMAIL || "user@example.com";
// WHY: Placeholder until /me returns. isAdmin defaults to true to prevent
// flash of restricted UI while the real value loads from the server.
const DEV_USER: UserInfo = {
  id: "dev-user",
  email: DEV_USER_EMAIL,
  name: "Dev User",
  avatarUrl: null,
  isAdmin: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    DEV_AUTH_BYPASS ? "dev-token" : getStoredToken()
  );
  const [user, setUser] = useState<UserInfo | null>(() =>
    DEV_AUTH_BYPASS ? DEV_USER : null
  );
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);
  const [loginError, setLoginError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setLoginError(null);
  }, []);

  // Exchange a Google token for a 7-day session token
  const login = useCallback((googleToken: string) => {
    setLoading(true);
    setLoginError(null);
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
      .catch((err) => {
        clearStoredToken();
        setToken(null);
        setUser(null);
        // Surface 403 "no access" errors to the login page
        if (err instanceof ApiError && err.status === 403) {
          setLoginError(err.message);
        } else {
          setLoginError("Login failed. Please try again.");
        }
        setLoading(false);
      });
  }, []);

  // On mount (or token change), validate the stored token and fetch real user info.
  // WHY: Even in dev bypass mode, we fetch /me so the server determines isAdmin
  // from ADMIN_EMAILS. This lets you test non-admin users by changing VITE_DEV_USER_EMAIL.
  useEffect(() => {
    if (!DEV_AUTH_BYPASS && !token) {
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
        if (!cancelled && !DEV_AUTH_BYPASS) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ token, user, loading, loginError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
