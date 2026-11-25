import { create } from "zustand";
import { apiClient, clearAuth } from "@/lib/api-client";

// Share one /auth/me request across concurrent app mounts.
let hydrationPromise: Promise<void> | null = null;

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
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
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
      } catch (error: any) {
        // Only an explicit unauthorized response proves the session is invalid.
        // A transient 429/5xx/network failure must not erase valid auth cookies.
        const unauthorized = error?.response?.status === 401;
        if (unauthorized) clearAuth();
        set((state) => ({
          isAuthenticated: unauthorized ? false : state.isAuthenticated,
          role: unauthorized ? null : state.role,
          organizationId: unauthorized ? null : state.organizationId,
          userName: unauthorized ? null : state.userName,
          isHydrated: true,
        }));
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  },
}));
