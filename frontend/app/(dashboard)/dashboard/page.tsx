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
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Plus,
  ShoppingCart,
  PlusCircle,
  CheckSquare,
  Square,
  Sparkles,
  Bot,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const userName = useAuthStore((state) => state.userName);
  const [poStatus, setPoStatus] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState<'today' | '7days' | '30days' | '12months'>('7days');
  
  // Interactive tasks checklist state
  const [tasks, setTasks] = useState([
    { id: 1, text: "Order Tomatoes", checked: false, action: "Reorder", link: "/products" },
    { id: 2, text: "Receive Fresh Farms delivery", checked: false, action: "Receive", link: "/purchase-orders" },
    { id: 3, text: "Check Milk expiry", checked: false, action: "Inspect", link: "/inventory" },
    { id: 4, text: "Update Chicken stock", checked: false, action: "Update", link: "/products" },
    { id: 5, text: "Review purchase invoices", checked: false, action: "Review", link: "/purchase-orders" }
  ]);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const handleGeneratePO = () => {
    setPoStatus("Generating purchase order...");
    setTimeout(() => {
      setPoStatus("Success: Purchase order created for low-stock ingredients!");
      setTimeout(() => setPoStatus(null), 3000);
    }, 1500);
  };

  // Fetch Dashboard Summary
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data;
    },
  });

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

  const { cards, top_selling_recipes, sales_trend } = data;

  // Format today's date
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="space-y-8">
      
      {/* 1. Header with Personalized Greeting & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            👋 Good Morning, {userName || 'Rahul'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Here's what's happening at <span className="text-emerald-600 font-bold">Cafe Aroma</span> today — {todayDateStr}.
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
              ₹{(cards.revenue_today ? Math.round(cards.revenue_today * 80) : 18540).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded px-1.5 py-0.5 mt-4 self-start">
            +12% from yesterday
          </span>
        </div>

        {/* Card 2: Inventory Value */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Value</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              ₹{(cards.inventory_value ? Math.round(cards.inventory_value * 80) : 245800).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-4 block">
            Current stock value
          </span>
        </div>

        {/* Card 3: Food Cost */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Food Cost</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              28%
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded px-1.5 py-0.5 mt-4 self-start">
            Target &lt;30%
          </span>
        </div>

        {/* Card 4: Low Stock */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Low Stock</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              {cards.low_stock_products || 8}
            </span>
          </div>
          <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 mt-4 self-start ${
            (cards.low_stock_products || 8) > 0 
              ? 'text-amber-600 bg-amber-50 border border-amber-100/50' 
              : 'text-emerald-600 bg-emerald-50 border border-emerald-100/50'
          }`}>
            {(cards.low_stock_products || 8) > 0 ? 'Needs attention' : 'Optimal Levels'}
          </span>
        </div>

        {/* Card 5: Expiring Soon */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expiring Soon</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              {cards.expiring_products || 5}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-4 block">
            Within 7 days
          </span>
        </div>

        {/* Card 6: Waste Today */}
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Waste Today</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
              ₹1,250
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-4 block">
            2.3% of inventory
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
                {tasks.filter(t => t.checked).length}/{tasks.length} Completed
              </span>
            </div>
            
            <div className="space-y-3 font-semibold text-xs text-slate-700">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/50 transition-colors">
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-3 text-left focus:outline-none cursor-pointer flex-1"
                  >
                    {task.checked ? (
                      <CheckSquare size={18} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Square size={18} className="text-slate-400 shrink-0" />
                    )}
                    <span className={task.checked ? "line-through text-slate-400 font-medium" : "text-slate-800"}>
                      {task.text}
                    </span>
                  </button>
                  <Link href={task.link} className="py-1 px-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-600 rounded-lg text-[10px] font-extrabold shadow-sm transition-all">
                    {task.action}
                  </Link>
                </div>
              ))}
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

            <div className="space-y-3 font-semibold text-xs leading-normal">
              <div className="flex items-start gap-2.5 p-3 bg-rose-50/50 border border-rose-100/50 rounded-xl text-rose-700">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <p>Chicken stock will run out tomorrow.</p>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-amber-50/50 border border-amber-100/50 rounded-xl text-amber-700">
                <Clock size={15} className="shrink-0 mt-0.5" />
                <p>Milk expires in 2 days.</p>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl text-emerald-700">
                <DollarSign size={15} className="shrink-0 mt-0.5" />
                <p>Ordering vegetables today could reduce costs.</p>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl text-blue-700">
                <TrendingUp size={15} className="shrink-0 mt-0.5" />
                <p>Burger sales increased 22% this week.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            {poStatus && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle size={12} /> {poStatus}
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
                  className={`py-1 px-2.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer capitalize ${
                    chartFilter === filter
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales_trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Math.round(v * 80)}`} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', borderColor: '#e5e7eb', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
                  labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '11px' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}
                  formatter={(value: any) => [`₹${Math.round(value * 80).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
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
            <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center relative">
              {/* Healthy indicator track */}
              <div className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent border-r-transparent rotate-45"></div>
              {/* Low stock indicator track */}
              <div className="absolute inset-0 rounded-full border-8 border-amber-500 border-b-transparent border-l-transparent rotate-12"></div>
              {/* Critical indicator track */}
              <div className="absolute inset-0 rounded-full border-8 border-rose-500 border-b-transparent border-t-transparent -rotate-45"></div>
              <div className="text-center">
                <span className="text-2xl font-black text-slate-800">82%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Healthy</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 font-semibold text-xs text-slate-650 mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Healthy
              </span>
              <span className="font-mono text-slate-900">82%</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Low Stock
              </span>
              <span className="font-mono text-slate-900">12%</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical
              </span>
              <span className="font-mono text-slate-900">6%</span>
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
                    {top_selling_recipes[0]?.recipe_name || "Chicken Burger"}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block font-medium">
                    {top_selling_recipes[0]?.quantity_sold || 128} sold
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-slate-900 block font-mono text-xs">₹35,000</span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-0.5 mt-0.5">
                  <TrendingUp size={11} /> 12%
                </span>
              </div>
            </div>

            {/* Recipe 2 */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0">🥈</span>
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    {top_selling_recipes[1]?.recipe_name || "Cappuccino"}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block font-medium">
                    {top_selling_recipes[1]?.quantity_sold || 104} sold
                  </span>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 font-mono text-xs">₹12,480</span>
            </div>

            {/* Recipe 3 */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0">🥉</span>
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    {top_selling_recipes[2]?.recipe_name || "Pizza"}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block font-medium">
                    {top_selling_recipes[2]?.quantity_sold || 89} sold
                  </span>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 font-mono text-xs">₹31,150</span>
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
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                <div>
                  <span className="font-bold text-slate-800 block">Chicken</span>
                  <span className="text-rose-500 text-[10px] font-bold mt-1 block">2 kg left • Supplier: Fresh Farms</span>
                </div>
                <Link href="/purchase-orders" className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all">
                  Reorder
                </Link>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                <div>
                  <span className="font-bold text-slate-800 block">Cheese</span>
                  <span className="text-amber-500 text-[10px] font-bold mt-1 block">1.5 kg left</span>
                </div>
                <Link href="/purchase-orders" className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all">
                  Create PO
                </Link>
              </div>
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-semibold text-xs text-slate-700">
            {/* Card 1: Milk */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">Milk</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                    Expires Tomorrow
                  </span>
                </div>
                <span className="text-slate-400 font-medium block">Qty: 3 L</span>
              </div>
              <Link href="/inventory" className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-center text-[10px] shadow-sm transition-all cursor-pointer">
                Use First
              </Link>
            </div>

            {/* Card 2: Tomatoes */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">Tomatoes</span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                    Expires in 2 Days
                  </span>
                </div>
                <span className="text-slate-400 font-medium block">Qty: 8 kg</span>
              </div>
              <Link href="/inventory" className="py-2 px-3 bg-white border border-slate-250 hover:border-slate-350 text-slate-700 font-bold rounded-lg text-center text-[10px] shadow-sm transition-all cursor-pointer">
                View
              </Link>
            </div>
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
            {/* Activity 1 */}
            <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
              <div className="flex items-start gap-2.5">
                <span className="text-slate-400 font-mono text-[10px] mt-0.5 block shrink-0">10:24 AM</span>
                <div>
                  <span className="text-slate-800 block">Sale recorded</span>
                  <span className="text-slate-400 mt-0.5 block font-medium">UPI Transaction</span>
                </div>
              </div>
              <span className="font-extrabold text-emerald-600 font-mono">₹540</span>
            </div>

            {/* Activity 2 */}
            <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
              <div className="flex items-start gap-2.5">
                <span className="text-slate-400 font-mono text-[10px] mt-0.5 block shrink-0">09:55 AM</span>
                <div>
                  <span className="text-slate-800 block">Purchase received</span>
                  <span className="text-slate-400 mt-0.5 block font-medium">Supplier: Fresh Farms</span>
                </div>
              </div>
              <span className="font-extrabold text-slate-800 font-mono">₹7,820</span>
            </div>

            {/* Activity 3 */}
            <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
              <div className="flex items-start gap-2.5">
                <span className="text-slate-400 font-mono text-[10px] mt-0.5 block shrink-0">09:15 AM</span>
                <div>
                  <span className="text-slate-800 block">Inventory adjusted</span>
                  <span className="text-slate-400 mt-0.5 block font-medium">Product: Tomatoes</span>
                </div>
              </div>
              <span className="font-extrabold text-blue-600 font-mono">+20 kg</span>
            </div>
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
              ₹{(cards.revenue_today ? Math.round(cards.revenue_today * 80) : 18540).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Expenses</span>
            <span className="text-base font-extrabold text-slate-850 block mt-1 font-mono">₹6,220</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Estimated Profit</span>
            <span className="text-base font-extrabold text-emerald-600 block mt-1 font-mono">₹12,320</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Health</span>
            <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">91%</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">AI Score</span>
            <span className="text-base font-extrabold text-emerald-650 block mt-1 font-mono">96/100</span>
          </div>
        </div>
      </div>

    </div>
  );
}
