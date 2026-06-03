import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode, useReducer } from "react";
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

type AuthState = {
  user: User | null;
  token: string | null;
}

type AuthAction =
  | { type: "LOGOUT"; }
  | { type: "STORED"; user: User; token: string; }
  | { type: "AUTH"; user: User; token: string; }

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "STORED":
      return { user: action.user, token: action.token };
    case "AUTH":
      return { user: action.user, token: action.token };
    case "LOGOUT":
      return { user: null, token: null };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, token: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (stored && storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        dispatch({ type: "STORED", token: stored, user });
      } catch {
        // Cleanup bad data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const handleAuth = useCallback((data: AuthResponse) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    dispatch({ type: "AUTH", token: data.token, user: data.user });
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
    dispatch({ type: "LOGOUT" });
  }, []);

  const contextValue = useMemo(
    () => ({
      user: state.user,
      token: state.token,
      loading,
      login,
      register,
      logout,
    }),
    [state.user, state.token, loading, login, register, logout]
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
