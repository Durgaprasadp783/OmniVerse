"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

export interface User {
  id?: string;
  email: string;
  full_name?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  // Restore session from localStorage & verify with /api/auth/me on mount
  useEffect(() => {
    async function loadUser() {
      const savedToken =
        localStorage.getItem("access_token") || localStorage.getItem("token");

      if (!savedToken) {
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        setIsLoading(false);
        return;
      }

      setToken(savedToken);
      const savedUserStr = localStorage.getItem("user");
      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr));
        } catch {
          // ignore parsing error
        }
      }

      try {
        const response = await api.get("/api/auth/me");
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
        document.cookie = `token=${savedToken}; path=/; max-age=86400; SameSite=Lax`;
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = (newToken: string, newUser?: User) => {
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("token", newToken);
    document.cookie = `token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
    setToken(newToken);

    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default AuthContext;
