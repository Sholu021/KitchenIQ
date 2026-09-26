import { create } from "zustand";
import { apiClient, clearAuth } from "@/lib/api-client";

interface AuthState {
  isAuthenticated: boolean;
  role: string | null;
  organizationId: number | null;
  userName: string | null;
  isHydrated: boolean;

  login: (role: string, organizationId: number, userName: string) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  organizationId: null,
  userName: null,
  isHydrated: false,

  login: (role, organizationId, userName) => {
    set({
      isAuthenticated: true,
      role,
      organizationId,
      userName,
      isHydrated: true,
    });
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearAuth();
      set({
        isAuthenticated: false,
        role: null,
        organizationId: null,
        userName: null,
        isHydrated: true,
      });
    }
  },

  hydrate: async () => {
    if (typeof window === "undefined") return;

    try {
      const response = await apiClient.get("/auth/me");
      const user = response.data;
      set({
        isAuthenticated: true,
        role: user.role,
        organizationId: user.organization_id,
        userName: user.full_name,
        isHydrated: true,
      });
    } catch {
      clearAuth();
      set({
        isAuthenticated: false,
        role: null,
        organizationId: null,
        userName: null,
        isHydrated: true,
      });
    }
  },
}));
