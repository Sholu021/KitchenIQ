import { create } from "zustand";
import { clearAuth } from "@/lib/api-client";

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  organizationId: number | null;
  userName: string | null;
  isHydrated: boolean;

  login: (
    accessToken: string,
    refreshToken: string,
    role: string,
    organizationId: number,
    userName: string
  ) => void;

  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  role: null,
  organizationId: null,
  userName: null,
  isHydrated: false,

  login: (
    accessToken,
    refreshToken,
    role,
    organizationId,
    userName
  ) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user_role", role);
    localStorage.setItem("organization_id", organizationId.toString());
    localStorage.setItem("user_name", userName);

    set({
      isAuthenticated: true,
      accessToken,
      refreshToken,
      role,
      organizationId,
      userName,
      isHydrated: true,
    });
  },

  logout: () => {
    clearAuth();

    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      role: null,
      organizationId: null,
      userName: null,
      isHydrated: true,
    });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;

    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    const role = localStorage.getItem("user_role");
    const userName = localStorage.getItem("user_name");

    const orgId = localStorage.getItem("organization_id");

    set({
      isAuthenticated: Boolean(accessToken),
      accessToken,
      refreshToken,
      role,
      userName,
      organizationId: orgId ? Number(orgId) : null,
      isHydrated: true,
    });
  },
}));