'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-900 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-[#0f1626] animate-pulse rounded-2xl border border-slate-900"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-[#0f1626] animate-pulse rounded-2xl border border-slate-900"></div>
          <div className="h-80 bg-[#0f1626] animate-pulse rounded-2xl border border-slate-900"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
        <h3 className="font-bold">Failed to load dashboard data</h3>
        <p className="text-sm mt-1">{(error as any)?.message || 'Please try again later.'}</p>
      </div>
    );
  }

  const { cards, top_selling_recipes, sales_trend, inventory_consumption } = data;

  const cardStats = [
    {
      name: "Revenue Today",
      value: `$${cards.revenue_today.toFixed(2)}`,
      icon: DollarSign,
      color: "from-emerald-500/20 to-teal-500/5",
      textColor: "text-emerald-400",
      borderColor: "border-emerald-500/10"
    },
    {
      name: "Revenue This Month",
      value: `$${cards.revenue_month.toFixed(2)}`,
      icon: TrendingUp,
      color: "from-indigo-500/20 to-purple-500/5",
      textColor: "text-indigo-400",
      borderColor: "border-indigo-500/10"
    },
    {
      name: "Inventory Value",
      value: `$${cards.inventory_value.toFixed(2)}`,
      icon: PackageCheck,
      color: "from-blue-500/20 to-sky-500/5",
      textColor: "text-blue-400",
      borderColor: "border-blue-500/10"
    },
    {
      name: "Low Stock Products",
      value: cards.low_stock_products.toString(),
      icon: AlertTriangle,
      color: "from-amber-500/20 to-orange-500/5",
      textColor: "text-amber-400",
      borderColor: "border-amber-500/10",
      badge: cards.low_stock_products > 0 ? "Reorder Needed" : "Optimal",
      badgeColor: cards.low_stock_products > 0 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      link: "/products"
    },
    {
      name: "Expiring Products",
      value: cards.expiring_products.toString(),
      icon: Flame,
      color: "from-rose-500/20 to-red-500/5",
      textColor: "text-rose-400",
      borderColor: "border-rose-500/10",
      badge: cards.expiring_products > 0 ? "Action Required" : "Stable",
      badgeColor: cards.expiring_products > 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20",
      link: "/inventory"
    }
  ];

  const BAR_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Restaurant Intelligence</h1>
        <p className="text-sm text-slate-400 mt-1">Live analytics, stock health summaries, and sales execution tracking.</p>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cardStats.map((card, index) => (
          <div
            key={index}
            className={`bg-[#0f1626] border ${card.borderColor} rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between`}
          >
            {/* Background highlight */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${card.color} blur-3xl -z-10`}></div>
            
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.name}</span>
              <div className={`p-2 rounded-xl bg-slate-900/80 ${card.textColor}`}>
                <card.icon size={16} />
              </div>
            </div>

            <div className="mt-4">
              <span className="text-2xl font-black text-white">{card.value}</span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              {card.badge ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Auto updated</span>
              )}
              {card.link && (
                <Link href={card.link} className="text-slate-400 hover:text-white transition-colors">
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Trend Chart */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Sales & Revenue Trend</h3>
              <p className="text-xs text-slate-400">Daily gross revenue over the past 7 days.</p>
            </div>
            <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              +14% Growth
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales_trend}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#090e1a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Consumption Chart */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Ingredient Consumption Velocity</h3>
              <p className="text-xs text-slate-400">Top 5 inventory stock items consumed in the last 30 days.</p>
            </div>
          </div>

          {inventory_consumption.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              No stock consumption data recorded yet. Record sales to log adjustments.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventory_consumption} layout="vertical">
                  <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="product_name" type="category" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: '#090e1a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${value} units`, 'Quantity Out']}
                  />
                  <Bar dataKey="quantity_consumed" radius={[0, 4, 4, 0]}>
                    {inventory_consumption.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Top Selling Recipes Table */}
      <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2">Top Performing Menu Recipes</h3>
        <p className="text-xs text-slate-400 mb-6">High-frequency recipe logs ordered by number of units sold.</p>

        {top_selling_recipes.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            No sales logs found. Start selling recipes to generate metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-950/20">
                <tr>
                  <th className="px-6 py-4 font-semibold">Rank</th>
                  <th className="px-6 py-4 font-semibold">Recipe Name</th>
                  <th className="px-6 py-4 font-semibold text-right">Units Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {top_selling_recipes.map((recipe: any, index: number) => (
                  <tr key={index} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-400"># {index + 1}</td>
                    <td className="px-6 py-4 font-semibold text-white">{recipe.recipe_name}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">{recipe.quantity_sold} sales</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
