"use client";
import { ReactNode, useState, useEffect, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import { AuthContext, useAuthProvider } from "@/hooks/useAuth";
import { ThemeContext, useTheme, type Theme } from "@/hooks/useTheme";

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ivote_theme") as Theme | null;
      const pref: Theme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setTheme(pref);
      document.documentElement.setAttribute("data-theme", pref);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("ivote_theme", next);
        document.documentElement.setAttribute("data-theme", next);
      } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: dark
          ? {
              background: "rgba(255,255,255,0.06)",
              color: "#e8e4dc",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              fontSize: "13px",
              fontFamily: "Inter, system-ui, sans-serif",
            }
          : {
              background: "#e7e1d4",
              color: "#0e0903",
              border: "1px solid rgba(14,9,3,0.12)",
              boxShadow: "0 4px 20px rgba(14,9,3,0.10)",
              fontSize: "13px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
      }}
    />
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return (
    <AuthContext.Provider value={auth}>
      <ThemeProvider>
        <ThemedToaster />
        {children}
      </ThemeProvider>
    </AuthContext.Provider>
  );
}
