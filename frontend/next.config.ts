import type { NextConfig } from "next";

const configuredBackendUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://kitcheniq-h1aa.onrender.com"
    : "http://localhost:8000");

// Accept either a backend origin or an API base URL. The rewrite below owns
// the /api/v1 prefix, so strip it here to prevent /api/v1/api/v1/* requests.
const backendOrigin = configuredBackendUrl
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: \`${backendOrigin}/api/v1/:path*\`,
      },
    ];
  },
};

export default nextConfig;
