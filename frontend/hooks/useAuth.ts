"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { getMe, login as apiLogin } from "@/lib/api";
import { getToken, setToken, setUser, getUser, clearStore } from "@/lib/store";

interface AuthContextType {
  user: any;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  updateUser: (user: any) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthProvider() {
  const [user, setUserState] = useState<any>(() => getUser());
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef(user);
  const authCheckStarted = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    // The public landing page is static. Do not wake or validate the API
    // merely because a visitor has an old token in local storage.
    if (pathname === "/") {
      setIsLoading(false);
      return;
    }
    if (authCheckStarted.current) return;
    authCheckStarted.current = true;

    const storedToken = getToken();
    if (!storedToken) { setIsLoading(false); return; }
    let cancelled = false;
    getMe()
      .then((freshUser) => {
        if (cancelled) return;
        setUser(freshUser);
        userRef.current = freshUser;
        setUserState(freshUser);
      })
      .catch(() => {
        if (cancelled) return;
        clearStore();
        userRef.current = null;
        setUserState(null);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [pathname]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setToken(data.access_token);
    setUser(data.user);
    userRef.current = data.user;
    setUserState(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearStore();
    userRef.current = null;
    setUserState(null);
  }, []);

  const updateUser = useCallback((updatedUser: any) => {
    setUser(updatedUser);
    userRef.current = updatedUser;
    setUserState(updatedUser);
  }, []);

  return {
    user,
    token: getToken(),
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "election_head",
    login,
    logout,
    updateUser,
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
