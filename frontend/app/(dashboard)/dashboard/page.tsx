'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  AlertTriangle,
  Plus,
  ShoppingCart,
  PlusCircle,
  Sparkles,
  Bot,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import {
  getExecutiveSummary,
  getDashboardSummary,
  getDashboardOverview,
  getProfitSummary,
  getSalesTrend,
  getTopSellingRecipes,
  getLowStockItems,
  getExpiringItems,
  getAIInsights,
} from "@/lib/dashboard";

export default function DashboardPage() {
  type AIInsight = {
    type: string;
    title: string;
    message: string;
  };
  const router = useRouter();

  const userName = useAuthStore((state) => state.userName);
  const [poStatus, setPoStatus] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState<'today' | '7days' | '30days' | '12months'>('7days');

  const handleGeneratePO = async () => {
    try {

      setPoStatus("Generating purchase order...");

      const res = await apiClient.post("/purchase-orders/generate");

      setPoStatus(
        `Purchase Order ${res.data.po_number} created successfully`
     );

    } catch (err: any) {

      setPoStatus(
        err.response?.data?.detail ??
        "Unable to generate purchase order."
      );
    }

    setTimeout(() => setPoStatus(null), 5000);
  };

  // Fetch Dashboard Summary
  const {
    data: executive,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["executive-summary"],
    queryFn: getExecutiveSummary,
  });

  const { data: organization } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const res = await apiClient.get("/auth/organization");
      return res.data;
    },
  });

  const {
    data: profitSummary,
    isLoading: profitLoading,
    isError: profitError,
    error: profitErrorDetails,
  } = useQuery({
    queryKey: ["profit-summary"],
    queryFn: getProfitSummary,
  });

  const { data: topSellingRecipesData } = useQuery({
    queryKey: ["top-selling-recipes"],
    queryFn: getTopSellingRecipes,
  });

  const { data: salesTrendData } = useQuery({
    queryKey: ["sales-trend"],
    queryFn: getSalesTrend,
  });
  
  const { data: aiInsightsData } = useQuery<{
    insights: AIInsight[];
  }>({
    queryKey: ["ai-insights"],
    queryFn: getAIInsights,
  });

  const { data: lowStockData = [] } = useQuery({
    queryKey: ["low-stock"],
    queryFn: getLowStockItems,
  });

  const { data: expiringItemsData = [] } = useQuery({
    queryKey: ["expiring-items"],
    queryFn: getExpiringItems,
  });

  const { data: overview } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  const { data: dashboardSummary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  console.log("Loading:", profitLoading);
  console.log("Error:", profitError);
  console.log("Error Details:", profitErrorDetails);
  console.log("Profit Summary:", profitSummary);
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
          <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
        <h3 className="font-bold text-base">Failed to load dashboard summary</h3>
        <p className="text-sm mt-1">{(error as any)?.message || 'Please verify the server is running and try again.'}</p>
      </div>
    );
  }
  const cards = executive ?? {};

  const topSellingRecipes = Array.isArray(topSellingRecipesData)
    ? topSellingRecipesData
    : [];

  const recentActivity = Array.isArray(dashboardSummary?.recent_activity)
    ? dashboardSummary.recent_activity
    : [];

  const lowStockItems = Array.isArray(lowStockData)
    ? lowStockData
    : [];

  const expiringItems = Array.isArray(expiringItemsData)
    ? expiringItemsData
    : [];

  const expiringSoonItems = expiringItems.filter(
    (item: any) => item.days_left <= 7
  );

  const expiringSoonCount = expiringSoonItems.length;



  const salesTrend = Array.isArray(salesTrendData)
    ? salesTrendData.map((item: any) => ({
        date: item.date,
        revenue: Number(item.revenue ?? 0),
        profit: Number(item.profit ?? 0),
      }))
    : [];
  
  const aiInsights: AIInsight[] = aiInsightsData?.insights ?? [];

  const recipe1 = topSellingRecipes[0];
  const recipe2 = topSellingRecipes[1];
  const recipe3 = topSellingRecipes[2];

  // Format today's date
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 18
      ? "Good Afternoon"
      : "Good Evening";
  
  const healthColor =
    (overview?.inventory?.health_score ?? 0) >= 90
      ? "#10b981"
      : (overview?.inventory?.health_score ?? 0) >= 75
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="space-y-8">

      {/* 1. Header with Personalized Greeting & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            👋 {greeting}, {userName || "there"}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Here's what's happening at <span className="text-emerald-600 font-bold">{organization?.name ?? "your restaurant"}</span> today — {todayDateStr}.
          </p>
        </div>

        {/* Large green primary buttons and quick links */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/sales" className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer">
            <Plus size={14} /> Record Sale
          </Link>
          <Link href="/purchase-orders" className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-emerald-200/50 cursor-pointer">
            <ShoppingCart size={14} /> New Purchase
          </Link>
          <Link href="/products" className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer">
            <PlusCircle size={14} /> Add Ingredient
          </Link>
        </div>
      </div>

      {/* 2. Six KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

        {/* Card 1: Today's Sales */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Today's Sales</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              ₹{Number(overview?.sales?.today ?? 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mt-4 self-start">
            Daily sales
          </span>
        </div>

        {/* Card 2: Inventory Value */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Value</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              ₹{Math.round(cards?.inventory_value ?? 0).toLocaleString("en-IN")}
            </span>
            
          
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-4 block">
            Current stock value
          </span>
        </div>

        {/* Card: Pending Purchase Orders */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Pending Purchase Orders
            </span>

            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              {cards?.pending_purchase_orders ?? 0}
            </span>
          </div>

          <span
            className={`text-[10px] font-bold rounded px-1.5 py-0.5 mt-4 self-start ${
              (cards?.pending_purchase_orders ?? 0) > 0
                ? "text-amber-600 bg-amber-50 border border-amber-100/50"
                : "text-emerald-600 bg-emerald-50 border border-emerald-100/50"
            }`}
          >
            {(cards?.pending_purchase_orders ?? 0) > 0
              ? "Action required"
              : "All clear"}
          </span>
        </div>

        {/* Card 3: Food Cost */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Food Cost</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              {(cards?.food_cost_percentage ?? 0).toFixed(2)}%
            </span>
          </div>
          <span
            className={`text-[10px] font-bold rounded px-1.5 py-0.5 mt-4 self-start ${
              (cards?.food_cost_percentage ?? 0) <= 30
                ? "text-emerald-600 bg-emerald-50 border border-emerald-100"
                : "text-rose-600 bg-rose-50 border border-rose-100"
            }`}
          >
            {(cards?.food_cost_percentage ?? 0) <= 30
              ? "Within Target"
              : "Above Target"}
          </span>
        </div>
        
        {/* Card: Average Order Value */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Average Order Value
            </span>

            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              ₹{(cards?.average_order_value ?? 0).toFixed(2)}
            </span>
          </div>

          <span className="text-[10px] font-semibold text-slate-400 mt-4 block">
            {cards?.total_orders ?? 0} orders
          </span>
        </div>
        
        {/* Card: Gross Margin */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Gross Margin
            </span>

            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              {(cards?.gross_margin_percentage ?? 0).toFixed(2)}%
            </span>
          </div>

          <span
            className={`text-[10px] font-bold rounded px-1.5 py-0.5 mt-4 self-start ${
              (cards?.gross_margin_percentage ?? 0) >= 60
                ? "text-emerald-600 bg-emerald-50 border border-emerald-100"
                : (cards?.gross_margin_percentage ?? 0) >= 45
                ? "text-amber-600 bg-amber-50 border border-amber-100"
                : "text-rose-600 bg-rose-50 border border-rose-100"
            }`}
          >
            {(cards?.gross_margin_percentage ?? 0) >= 60
              ? "Healthy Margin"
              : (cards?.gross_margin_percentage ?? 0) >= 45
              ? "Monitor Margin"
              : "Low Margin"}
          </span>
        </div>

        {/* Card 4: Low Stock */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Low Stock</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              {cards?.low_stock_products ?? 0}
            </span>
          </div>
          <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 mt-4 self-start ${(cards?.low_stock_products ?? 0) > 0
              ? 'text-amber-600 bg-amber-50 border border-amber-100/50'
              : 'text-emerald-600 bg-emerald-50 border border-emerald-100/50'
            }`}>

            {(cards?.low_stock_products ?? 0) > 0
              ? 'Needs attention'
              : 'Optimal Levels'}

          </span>
        </div>

        {/* Card 5: Expiring Soon */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expiring Soon</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              {expiringSoonCount}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold rounded px-1.5 py-0.5 mt-4 self-start ${
              expiringSoonCount > 0
                ? "text-amber-600 bg-amber-50 border border-amber-100/50"
                : "text-emerald-600 bg-emerald-50 border border-emerald-100/50"
            }`}
          >
            {expiringSoonCount > 0
              ? `${expiringSoonCount} item${expiringSoonCount > 1 ? "s" : ""} need attention`
              : "No items expiring soon"}
          </span>
        </div>

        {/* Card 6: Waste Today */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Waste Today</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              ₹{(cards?.waste_today ?? 0).toFixed(2)}
            </span>
          </div>
          <span
            className={`text-[10px] font-semibold mt-4 block ${
              (cards?.waste_percentage ?? 0) > 5
                ? "text-rose-600"
                : "text-slate-400"
            }`}
          >
            {(cards?.waste_percentage ?? 0).toFixed(2)}% of inventory
          </span>
        </div>

      </div>

      {/* 3 & 4. Checklist & AI Assistant Side-by-Side Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                📋 Today's Tasks
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {lowStockItems.length} Action{lowStockItems.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No low stock items 🎉
                </div>
              ) : (
                lowStockItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {item.name}
                      </span>

                      <span className="text-amber-600 text-xs">
                        {item.stock} {item.unit} left • Reorder at {item.reorder_level}
                      </span>
                    </div>

                    <Link
                      href="/purchase-orders"
                      className="py-1.5 px-3 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                    >
                      Reorder
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Regular daily audits checklist</span>
            <Link href="/products" className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5">
              Manage Catalog <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* AI Assistant Centerpiece */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-emerald-500/5 blur-2xl -z-10"></div>

          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bot size={18} className="text-emerald-500 animate-pulse" /> KitchenIQ Assistant
              </h3>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-full">
                Active Insights
              </span>
            </div>

            <p className="text-xs text-slate-400 font-semibold mb-4">
              Good morning. Here are today's AI-computed operations recommendations:
            </p>

            <div className="space-y-3">

              {aiInsights.map((item, index) => (

                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    item.type === "danger"
                      ? "bg-rose-50 border-rose-100 text-rose-700"
                      : item.type === "warning"
                      ? "bg-amber-50 border-amber-100 text-amber-700"
                      : item.type === "success"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                      : "bg-blue-50 border-blue-100 text-blue-700"
                  }`}
                >
                  <Bot size={16} />
                  <div>
                    <div className="font-bold text-xs">
                      {item.title}
                    </div>

                    <div className="text-xs mt-1">
                      {item.message}
                    </div>
                  </div>
                </div>

              ))}

            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            {poStatus && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                {poStatus?.includes("created") ? (
                    <CheckCircle size={12}/>
                ) : (
                    <AlertTriangle size={12}/>
               )}
              </span>
            )}
            <button
              onClick={handleGeneratePO}
              className="ml-auto py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer transition-all"
            >
              Generate Purchase Order
            </button>
          </div>
        </div>

      </div>

      {/* 5 & 6. Sales Chart & Inventory Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Sales & Revenue Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Daily gross sales metrics over time.</p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-200/60 rounded-xl">
              {(['today', '7days', '30days', '12months'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChartFilter(filter)}
                  className={`py-1 px-2.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer capitalize ${chartFilter === filter
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {filter === '7days' ? '7 Days' : filter === '30days' ? '30 Days' : filter === '12months' ? '12 Months' : 'Today'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height={230} minWidth={0}>
              <AreaChart
                data={salesTrend}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />

                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
                />

                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                  formatter={(value, name) => [
                    `₹${Number(value).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    name === "revenue" ? "Revenue" : "Profit",
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
                
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={0}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Health */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-900">Inventory Health</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Categorized stock limits layout.</p>
          </div>

          <div className="flex flex-col items-center justify-center py-4 relative">
            {/* Custom circular segmented/donut visual simulator */}
            <div className="relative w-32 h-32 flex items-center justify-center">

              <svg className="absolute w-32 h-32 -rotate-90">

                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                  fill="none"
                />

                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke={healthColor}
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={339.3}
                  strokeDashoffset={
                    339.3 -
                    (339.3 * (overview?.inventory?.health_score ?? 0)) / 100
                  }
                />

              </svg>

              <div className="text-center z-10">
                <div className="text-2xl font-black text-slate-800">
                  {overview?.inventory?.health_score ?? 0}%
                </div>

                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Health
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-2.5 font-semibold text-xs text-slate-650 mt-4 border-t border-slate-100 pt-4">

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Health Score
             </span>

             <span className="font-mono text-slate-900">
               {overview?.inventory?.health_score ?? 0}%
             </span>
           </div>

           <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
             <span className="flex items-center gap-2 text-slate-700">
               <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
               Low Stock
             </span>

             <span className="font-mono text-slate-900">
               {cards?.low_stock_products ?? 0} items
             </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Expiring
              </span>

              <span className="font-mono text-slate-900">
                {cards?.expiring_products ?? 0} batches
             </span>
            </div>

          </div>
        </div>

        </div>

      {/* 7 & 8. Top Selling & Low Stock Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Selling Items */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top Selling Items</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Menu performance logs compilation.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Recipe 1 */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0">🥇</span>
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    {recipe1?.recipe_name ?? "No sales data yet"}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block font-medium">
                    {recipe1?.quantity_sold ?? 0} sold
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-slate-900 block font-mono text-xs">
                  ₹{Number(recipe1?.revenue ?? 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Recipe 2 */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0">🥈</span>
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    {recipe2?.recipe_name ?? "No sales data yet"}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block font-medium">
                    {recipe2?.quantity_sold ?? 0} sold
                  </span>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 font-mono text-xs">
                ₹{Number(recipe2?.revenue ?? 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Recipe 3 */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0">🥉</span>
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    {recipe3?.recipe_name ?? "No sales data yet"}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block font-medium">
                    {recipe3?.quantity_sold ?? 0} sold
                  </span>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 font-mono text-xs">
                ₹{Number(recipe3?.revenue ?? 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Low Stock Ingredients</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Ingredients falling below safety reorder limits.</p>
              </div>
            </div>

            <div className="space-y-3 font-semibold text-xs text-slate-700">
              {lowStockItems.length === 0 ? (
               <div className="text-center py-8 text-slate-400">
                 All inventory levels are healthy.
               </div>
             ) : (
               lowStockItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {item.name}
                    </span>

                    <span className="text-rose-500 text-[10px] font-bold mt-1 block">
                      {item.stock} {item.unit} left • Reorder at {item.reorder_level}
                    </span>
                  </div>

                  <Link
                    href="/purchase-orders"
                    className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all"
                  >
                    Reorder
                  </Link>
               </div>
            ))
          )}
        </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Critical safety limits audit</span>
              <Link href="/products" className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-0.5">
                View All Products <ArrowRight size={13} />
              </Link>
            </div>
          </div>

        </div>

        {/* 9 & 10. Expiring Items & Recent Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Expiring Ingredients */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Expiring Ingredients</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Batches with near expiry warning dates.</p>
              </div>
            </div>

            
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {expiringSoonItems.length === 0 ? (

                <div className="col-span-2 text-center py-8 text-slate-400">
                  No expiring batches 🎉
                </div>

              ) : (

              expiringSoonItems.map((item: any) => (

                <div
                  key={item.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-3"
                >

                  <div>

                    <div className="flex items-center justify-between">

                      <span className="font-bold text-slate-800">
                        {item.name}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          item.days_left <= 0
                            ? "bg-red-100 text-red-700"
                            : item.days_left <= 2
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.days_left <= 0
                          ? "Expired"
                          : `${item.days_left} day${item.days_left > 1 ? "s" : ""} left`}
                      </span>

                    </div>

                    <span className="text-slate-500 text-xs block mt-2">
                      Qty: {item.quantity} {item.unit}
                    </span>

                    <span className="text-slate-400 text-xs">
                      Exp: {new Date(item.expiry_date).toLocaleDateString()}
                    </span>

                  </div>

                  <button
                    onClick={() => router.push("/inventory")}
                    className="py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
                  >
                    Use First
                  </button>
                  
                </div>

              ))

            )}

            </div>
        </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Activity Logs</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Real-time system transaction tracking.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">

              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No recent activity yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity: any, index: number) => (
                    <div
                      key={`${activity.type}-${activity.time}-${index}`}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {activity.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {activity.subtitle}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800 block">
                          {activity.type === "inventory"
                            ? `${Number(activity.quantity ?? 0).toLocaleString("en-IN")} units`
                            : activity.amount !== undefined
                            ? `₹${Number(activity.amount).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : ""}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(activity.time).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>

        {/* 11. Quick Actions Row (Always Visible) */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 shadow-inner">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Operations Access</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href="/sales" className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs text-center shadow-sm transition-all block">
              + Record Sale
            </Link>
            <Link href="/purchase-orders" className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs text-center shadow-sm transition-all block">
              + Add Purchase
            </Link>
            <Link href="/products" className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs text-center shadow-sm transition-all block">
              + Add Ingredient
            </Link>
            <Link href="/suppliers" className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs text-center shadow-sm transition-all block">
              + Add Supplier
            </Link>
            <Link href="/recipes" className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs text-center shadow-sm transition-all block">
              + Create Recipe
            </Link>
            <Link href="/analytics" className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs text-center shadow-sm transition-all block">
              + Generate Report
            </Link>
          </div>
        </div>

        {/* 12. Footer Summary Section */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
            <Sparkles size={16} className="text-emerald-500" /> Today's Operations Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold text-slate-650">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Sales</span>
              <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">          
                ₹{Number(overview?.sales?.today ?? 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Expenses</span>
              <span className="text-base font-extrabold text-slate-850 block mt-1 font-mono">₹{Number(profitSummary?.today?.expenses ?? 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Estimated Profit</span>
              <span className="text-base font-extrabold text-emerald-600 block mt-1 font-mono">₹{Number(profitSummary?.today?.profit ?? 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Health</span>
              <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">
                {overview?.inventory?.health_score ?? 0}%
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                Business Health
              </span>

              <span
                className={`text-base font-extrabold block mt-1 font-mono ${
                  cards?.business_grade === "A"
                    ? "text-emerald-600"
                    : cards?.business_grade === "B"
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {cards?.business_grade ?? "N/A"}
              </span>

              <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
                {cards?.business_status ?? "Unknown"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
