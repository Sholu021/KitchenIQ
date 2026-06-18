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
  const [days, setDays] = useState(14);

  // Fetch Analytics data
  const { data: analytics, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics?days=${days}`);
      return res.data;
    }
  });

  const BAR_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#a855f7'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-900 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-[#0f1626] animate-pulse rounded-2xl border border-slate-900"></div>
          <div className="h-96 bg-[#0f1626] animate-pulse rounded-2xl border border-slate-900"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
        <h3 className="font-bold">Failed to load analytics trends</h3>
        <p className="text-sm mt-1">{(error as any)?.message || 'Verify your network connection.'}</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs cursor-pointer">
          Retry Sync
        </button>
      </div>
    );
  }

  const { sales_trend, wastage_trend, category_breakdown, inventory_velocity } = analytics;

  // Custom calculations
  const totalSales = sales_trend.reduce((acc: number, item: any) => acc + item.amount, 0);
  const totalWastage = wastage_trend.reduce((acc: number, item: any) => acc + item.amount, 0);

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-indigo-400" /> Executive Analytics & Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">Visual insights covering sales execution, category values, and wastage metrics.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Days selector */}
          <div className="flex p-1 bg-slate-950/40 border border-slate-900 rounded-xl">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  days === d
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
            {isRefetching ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex items-center gap-5">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-3xl -z-10"></div>
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <TrendingUp size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Sales Revenue ({days}d)</span>
            <span className="text-3xl font-black text-white mt-1 block font-mono">${totalSales.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex items-center gap-5">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-rose-500/5 blur-3xl -z-10"></div>
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Flame size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Wastage Cost ({days}d)</span>
            <span className="text-3xl font-black text-white mt-1 block font-mono">${totalWastage.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Charts section 1: Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sales Chart */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-400" /> Sales Revenue Velocity
            </h3>
            <p className="text-xs text-slate-400 mt-1">Daily gross revenue sales trends over the selected duration.</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales_trend}>
                <defs>
                  <linearGradient id="colorSalesAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#090e1a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesAnalytics)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wastage Cost Chart */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame size={16} className="text-rose-400" /> Sunk Cost Wastage Trend
            </h3>
            <p className="text-xs text-slate-400 mt-1">Daily food waste and spillage value tracking.</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wastage_trend}>
                <defs>
                  <linearGradient id="colorWastageAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#090e1a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, 'Loss']}
                />
                <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWastageAnalytics)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Charts section 2: Composition & Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Category Breakdown Pie */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6 lg:col-span-1">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon size={16} className="text-indigo-400" /> Category Valuation
            </h3>
            <p className="text-xs text-slate-400 mt-1">Cost valuation distribution by categories.</p>
          </div>

          {category_breakdown.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-500 text-sm">
              No categories mapped yet.
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="h-48 w-48 relative">
                <ResponsiveContainer width="100%" height="100%">
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
                      contentStyle={{ background: '#090e1a', borderColor: '#1e293b', borderRadius: '12px' }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Cost Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends list */}
              <div className="w-full space-y-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {category_breakdown.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}></span>
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stock Flow Velocity Double Bar */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6 lg:col-span-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" /> Inventory flow velocity (Last 30 Days)
            </h3>
            <p className="text-xs text-slate-400 mt-1">Comparison of total quantities received (Stock In) vs consumed (Stock Out) by ingredient.</p>
          </div>

          {inventory_velocity.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              No stock transaction records found.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventory_velocity}>
                  <XAxis dataKey="product_name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#090e1a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  <Bar dataKey="stock_in" name="Stock In" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="stock_out" name="Stock Out" fill="#ec4899" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
