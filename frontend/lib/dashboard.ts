import { apiClient } from "@/lib/api-client";

export async function getExecutiveSummary() {
  const response = await apiClient.get("/dashboard/executive-summary");
  return response.data;
}

export async function getProfitSummary() {
  const response = await apiClient.get("/dashboard/profit-summary");
  return response.data;
}

export const getSalesTrend = async () => {
  const response = await apiClient.get("/dashboard/sales-trend");
  return response.data;
};

export async function getLowStockItems() {
  const response = await apiClient.get("/dashboard/low-stock");
  return response.data;
}

export const getExpiringItems = async () => {
  const response = await apiClient.get("/dashboard/expiring-items");
  return response.data;
};

export async function getTopSellingRecipes() {
  const response = await apiClient.get("/dashboard/top-selling-recipes");
  return response.data;
}



export async function getAIInsights() {
  const response = await apiClient.get("/dashboard/ai-insights");
  return response.data;
}