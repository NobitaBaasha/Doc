import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/api";
import { z } from "zod";
import { useState, useEffect } from "react";

// Types derived from schema
type LoginInput = z.infer<typeof api.auth.login.input>;
type RegisterInput = z.infer<typeof api.auth.register.input>;
type AuthResponse = z.infer<typeof api.auth.login.responses[200]>;

export function useAuth() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Hydrate user from local storage if exists (simple persistence)
    // In a real app, we might want to validate this token with a /me endpoint
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }

      const data = api.auth.login.responses[200].parse(await res.json());
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setLocation("/dashboard");
    },
  });

  const register = useMutation({
    mutationFn: async (credentials: RegisterInput) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }

      const data = api.auth.register.responses[201].parse(await res.json());
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setLocation("/dashboard");
    },
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setLocation("/login");
  };

  return {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
}
