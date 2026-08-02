import { apiClient } from "@/lib/api-client";

export async function getExecutiveSummary() {
  const response = await apiClient.get("/dashboard/executive-summary");
  return response.data;
}
export async function getProfitSummary() {
  const response = await apiClient.get("/dashboard/profit-summary");
  return response.data;
}