import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("organization_id");
  localStorage.removeItem("user_name");
}

function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )kitcheniq_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

apiClient.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

let refreshPromise: Promise<unknown> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !String(originalRequest?.url || "").includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise ??= axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        ).finally(() => {
          refreshPromise = null;
        });

        await refreshPromise;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
