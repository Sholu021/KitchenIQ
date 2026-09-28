// Backward-compatible entry point for older frontend imports.
// Keep all API traffic on the hardened same-origin client, which uses
// HttpOnly auth cookies and CSRF protection. Do not reintroduce localStorage
// bearer-token authentication here.
export { apiClient as default, apiClient } from "./api-client";
