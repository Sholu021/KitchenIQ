import { create } from 'zustand';

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
  login: (accessToken, refreshToken, role, organizationId, userName) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_role', role);
    localStorage.setItem('organization_id', organizationId.toString());
    localStorage.setItem('user_name', userName);
    set({
      isAuthenticated: true,
      accessToken,
      refreshToken,
      role,
      organizationId,
      userName,
    });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('user_name');
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      role: null,
      organizationId: null,
      userName: null,
    });
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const role = localStorage.getItem('user_role');
      const orgIdStr = localStorage.getItem('organization_id');
      const userName = localStorage.getItem('user_name');
      const organizationId = orgIdStr ? parseInt(orgIdStr, 10) : null;

      set({
        isAuthenticated: !!accessToken,
        accessToken,
        refreshToken,
        role,
        organizationId,
        userName,
        isHydrated: true,
      });
    }
  },
}));
