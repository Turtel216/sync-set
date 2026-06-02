import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { api } from "../lib/api";
import { disconnectSocket } from "../lib/socket";
import type { User, AuthResponse } from "../shared/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (stored && storedUser) {
      setToken(stored);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleAuth = useCallback((data: AuthResponse) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login", { username, password });
    handleAuth(data);
  }, [handleAuth]);

  const register = useCallback(async (username: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/register", { username, password });
    handleAuth(data);
  }, [handleAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    setToken(null);
    setUser(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
