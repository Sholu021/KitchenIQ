'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Flame,
  PieChart as PieIcon,
  RefreshCw,
  Calendar
} from 'lucide-react';

export default function AnalyticsPage() {
  const [days, setDays] = useState<number | 'all'>(14);

  // Fetch Analytics data
  const { data: analytics, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics?days=${days}`);
      return res.data;
    }
  });

  const BAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#a855f7'];
  const periods: Array<number | 'all'> = [7, 14, 30, 'all'];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
          <div className="h-32 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
          <div className="h-96 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
        <h3 className="font-bold text-base">Failed to load analytics trends</h3>
        <p className="text-sm mt-1">{(error as any)?.message || 'Verify your network connection.'}</p>
        <button 
          onClick={() => refetch()} 
          className="mt-4 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs cursor-pointer transition-colors"
        >
          Retry Sync
        </button>
      </div>
    );
  }

  const {
    sales_trend = [],
    wastage_trend = [],
    category_breakdown = [],
    inventory_velocity = [],
    trend_granularity = "daily",
  } = analytics ?? {};

  // Custom calculations
  const totalSales = sales_trend.reduce((acc: number, item: any) => acc + item.amount, 0);
  const totalWastage = wastage_trend.reduce((acc: number, item: any) => acc + item.amount, 0);
  const periodLabel = days === 'all' ? 'All Time' : `${days}d`;
  const trendLabel = trend_granularity === 'weekly' ? 'Weekly' : 'Daily';

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-emerald-500 shrink-0" /> Executive Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Visual insights covering sales execution, category values, and wastage metrics.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Days selector */}
          <div className="flex p-1.5 bg-slate-100 rounded-xl">
            {periods.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  days === d
                    ? 'bg-white text-slate-900 border border-slate-200/80 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {d === 'all' ? 'All Time' : `${d} Days`}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="py-2.5 px-3.5 bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin text-slate-400' : 'text-slate-400'} />
            {isRefetching ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500">
            <TrendingUp size={28} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total Sales Revenue ({periodLabel})</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block font-mono" >₹{totalSales.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500">
            <Flame size={28} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total Wastage Cost ({periodLabel})</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block font-mono" >₹{totalWastage.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Charts section 1: Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sales Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" /> Sales Revenue Velocity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{trendLabel} gross revenue sales trends over the selected duration.</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <AreaChart data={sales_trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSalesAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
                  labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '11px' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                  formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSalesAnalytics)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wastage Cost Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Flame size={18} className="text-rose-500" /> Sunk Cost Wastage Trend
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{trendLabel} food waste and spillage value tracking.</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <AreaChart data={wastage_trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWastageAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
                  labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '11px' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                  formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Loss']}
                />
                <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorWastageAnalytics)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Charts section 2: Composition & Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Category Breakdown Pie */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 lg:col-span-1">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PieIcon size={18} className="text-emerald-500" /> Category Valuation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Cost valuation distribution by categories.</p>
          </div>

          {category_breakdown.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm font-medium">
              No categories mapped yet.
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="h-48 w-48 relative">
                <ResponsiveContainer width="100%" height={192} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={category_breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {category_breakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
                      itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                      formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Cost Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends list */}
              <div className="w-full space-y-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold">
                {category_breakdown.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}></span>
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stock Flow Velocity Double Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 lg:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-500" /> Inventory Flow Velocity ({periodLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Comparison of total quantities received (Stock In) vs consumed (Stock Out) by ingredient.</p>
          </div>

          {inventory_velocity.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">
              No stock transaction records found.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <BarChart data={inventory_velocity} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="product_name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', paddingTop: '10px' }} />
                  <Bar dataKey="stock_in" name="Stock In" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="stock_out" name="Stock Out" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
