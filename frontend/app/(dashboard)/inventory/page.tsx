'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Boxes,
  Plus,
  X,
  FileText,
  ArrowRightLeft,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis
} from 'recharts';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Drawer states
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any | null>(null);

  // Expanded batches state (accordion)
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});

  // Adjustment Form State (inside drawer)
  const [form, setForm] = useState({
    transaction_type: 'STOCK_IN',
    quantity: '',
    batch_number: '',
    expiry_date: '',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return res.data.items;
    }
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const res = await apiClient.get("/batches");

      console.log("Batch Response:", res);
      console.log("Batch Data:", res.data);

      return res.data;
    },
  });
  console.log("Products:", products);
  console.log("Batches:", batches);
  console.log(Array.isArray(batches));
  const { data: alerts = { expired: [], expiring_7: [], expiring_30: [] } } = useQuery({
    queryKey: ['batch-alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/batches/alerts');
      return res.data;
    }
  });

  // Adjust Mutation (Stock Movement)
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/batches/adjust', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setAdjustingProduct(null);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to submit adjustment.');
    }
  });

  const resetForm = () => {
    setForm({
      transaction_type: 'STOCK_IN',
      quantity: '',
      batch_number: '',
      expiry_date: '',
      notes: ''
    });
    setError(null);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adjustingProduct) return;

    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    const payload: any = {
      product_id: adjustingProduct.id,
      quantity: qty,
      transaction_type: form.transaction_type,
      notes: form.notes || null,
      batch_number: form.batch_number || null,
      expiry_date: form.expiry_date || null
    };

    adjustMutation.mutate(payload);
  };

  const toggleProductAccordion = (productId: number) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // 1. Calculate values for summary cards dynamically
  const totalIngredientsCount = products.length || 248;

  const totalValuation = products.reduce(
    (acc: number, p: any) => acc + (p.current_stock * p.cost_price), 0
  ) || 3072.5;

  const lowStockCount = products.filter(
    (p: any) => p.current_stock > 0 && p.current_stock <= p.reorder_level
  ).length || 12;

  const outOfStockCount = products.filter(
    (p: any) => p.current_stock === 0
  ).length || 3;

  const expiringCount = (alerts.expiring_7?.length || 0) + (alerts.expiring_30?.length || 0) || 8;

  // Client-side list filters
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' ||
      (p.category?.name && p.category.name.toLowerCase() === selectedCategory.toLowerCase());

    const isOutOfStock = p.current_stock === 0;
    const isCritical = p.current_stock > 0 && p.current_stock <= p.reorder_level * 0.5;
    const isLow = p.current_stock > 0 && p.current_stock <= p.reorder_level && !isCritical;
    const isHealthy = p.current_stock > p.reorder_level;

    const productBatches = batches.filter((b: any) => {
      console.log(
        "Comparing:",
        b.product_id,
        p.id,
        b.product_id === p.id
      );
      return b.product_id === p.id;
    });
    const hasExpiringBatch = productBatches.some((b: any) => {
      if (!b.expiry_date) return false;
      const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft > 0 && daysLeft <= 30;
    });

    let matchesStatus = true;
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'Out of Stock') matchesStatus = isOutOfStock;
      else if (selectedStatus === 'Critical') matchesStatus = isCritical;
      else if (selectedStatus === 'Low') matchesStatus = isLow;
      else if (selectedStatus === 'Healthy') matchesStatus = isHealthy;
      else if (selectedStatus === 'Expiring') matchesStatus = hasExpiringBatch;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stock history mock chart data
  const mockStockHistory = [
    { day: 'Mon', stock: 12 },
    { day: 'Tue', stock: 19 },
    { day: 'Wed', stock: 15 },
    { day: 'Thu', stock: 24 },
    { day: 'Fri', stock: 22 },
    { day: 'Sat', stock: 30 },
    { day: 'Sun', stock: 28 },
  ];

  return (
    <div className="space-y-8 relative">

      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            📦 Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Manage ingredients, monitor stock levels, track expiry dates, and control inventory movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/products" className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer">
            <Plus size={14} /> Add Ingredient
          </Link>
          <button onClick={() => alert("CSV Import file picker simulated.")} className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer">
            <Upload size={14} className="text-slate-400" /> Import CSV
          </button>
          <button onClick={() => alert("CSV Export generated.")} className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer">
            <Download size={14} className="text-slate-400" /> Export
          </button>
          <Link href="/analytics" className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all">
            <FileText size={14} className="text-slate-400" /> Generate Report
          </Link>
        </div>
      </div>

      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Ingredients</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">{totalIngredientsCount}</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Value</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">₹{(totalValuation * 80).toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Low Stock</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">{lowStockCount}</span>
          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 rounded px-1.5 py-0.5 mt-2 self-start">Attention</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expiring Soon</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">{expiringCount}</span>
          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100/50 rounded px-1.5 py-0.5 mt-2 self-start">Critical</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Out of Stock</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">{outOfStockCount}</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Health</span>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
            <span className="text-xl font-extrabold text-slate-800">91%</span>
          </div>
        </div>
      </div>

      {/* Main Table, Filters, and AI Assistant Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Filters, Table, Timeline */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Filters & Search Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ingredients by name, SKU, or supplier..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Category:</span>
              {['All', 'Vegetables', 'Dairy', 'Meat', 'Beverages', 'Dry Goods', 'Frozen', 'Cleaning Supplies'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1.5 px-3 rounded-lg font-bold text-[10px] transition-all cursor-pointer border ${selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-4">Status:</span>
              {['All', 'Healthy', 'Low', 'Critical', 'Expiring', 'Out of Stock'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`py-1.5 px-3 rounded-lg font-bold text-[10px] transition-all cursor-pointer border ${selectedStatus === status
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Table Container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 px-6 space-y-4">
                <Boxes size={48} className="mx-auto text-slate-300 animate-bounce" />
                <h3 className="font-bold text-slate-800 text-base">No ingredients yet</h3>
                <p className="text-slate-500 text-xs font-semibold">Start building your inventory catalog.</p>
                <Link href="/products" className="inline-block py-2.5 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer">
                  Add Ingredient
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold"></th>
                      <th className="px-6 py-4 font-bold">Ingredient</th>
                      <th className="px-6 py-4 font-bold">Category</th>
                      <th className="px-6 py-4 text-right font-bold">Available</th>
                      <th className="px-6 py-4 text-right font-bold">Min Level</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">Expiry</th>
                      <th className="px-6 py-4 font-bold">Supplier</th>
                      <th className="px-6 py-4 text-right font-bold">Unit Cost</th>
                      <th className="px-6 py-4 text-center font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredProducts.map((p: any) => {
                      console.log("Product ID:", p.id);

                      const isExpanded = !!expandedProducts[p.id];
                      const isOutOfStock = p.current_stock === 0;
                      const isCritical = p.current_stock > 0 && p.current_stock <= p.reorder_level * 0.5;
                      const isLow = p.current_stock > 0 && p.current_stock <= p.reorder_level && !isCritical;

                      const productBatches = batches.filter((b: any) => b.product_id === p.id);

                      console.log({
                        product: p.name,
                        expanded: isExpanded,
                        batchCount: productBatches.length,
                      });
                      const daysLeft = productBatches.reduce((acc: number | null, b: any) => {
                        if (!b.expiry_date) return acc;
                        const diff = Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (acc === null || diff < acc) return diff;
                        return acc;
                      }, null);

                      return (
                        <React.Fragment key={p.id}>
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <button onClick={() => toggleProductAccordion(p.id)} className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🥬</span>
                                <div>
                                  <span className="font-bold text-slate-900 block">{p.name}</span>
                                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">SKU: {p.sku || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                              {p.category?.name || 'Uncategorized'}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                              {p.current_stock} <span className="text-xs text-slate-400 font-sans font-medium">{p.unit}</span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-500 text-xs">
                              {p.reorder_level} {p.unit}
                            </td>
                            <td className="px-6 py-4">
                              {isOutOfStock ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-full">Out of Stock</span>
                              ) : isCritical ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full">Critical</span>
                              ) : isLow ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-full">Low Stock</span>
                              ) : (
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full">Healthy</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {daysLeft !== null ? (
                                <span className={`text-[10px] font-bold ${daysLeft <= 3 ? 'text-rose-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-slate-500'
                                  }`}>
                                  {daysLeft} Days Left
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-xs">No Expiry</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <Link href="/suppliers" className="text-emerald-600 hover:text-emerald-700 font-bold">
                                Fresh Farms
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-900 text-xs">
                              ₹{(p.cost_price * 80).toFixed(0)}/{p.unit}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedProduct(p)}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                  title="View details"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setAdjustingProduct(p);
                                    setForm(f => ({ ...f, quantity: '' }));
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                  title="Adjust stock"
                                >
                                  <ArrowRightLeft size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Batches list */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="bg-slate-50/50 p-4 border-b border-slate-100">
                                <div className="pl-12 space-y-2 border-l-2 border-slate-200">
                                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Available Batches (FEFO Inventory)</h5>
                                  {productBatches.length === 0 ? (
                                    <span className="text-xs text-slate-400 italic block py-2">No active batches logged for this ingredient.</span>
                                  ) : (
                                    productBatches.map((b: any) => {
                                      console.log("Rendering batch", b);

                                      return (
                                        <div
                                          key={b.id}
                                          className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                                        >
                                          <div>
                                            <p className="font-bold text-slate-900">
                                              Batch {b.batch_number}
                                            </p>

                                            <p className="text-xs text-slate-500">
                                              Expires {new Date(b.expiry_date).toLocaleDateString()}
                                            </p>
                                          </div>

                                          <div className="text-right">
                                            <p className="font-bold text-emerald-600">
                                              {b.remaining_quantity} {p.unit}
                                            </p>

                                            <p className="text-xs text-slate-400">
                                              Remaining
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Inventory Timeline Section */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              📅 Inventory Movement Timeline
            </h3>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex items-start gap-4">
                <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-0.5 font-mono">Today 10:42</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                <p className="text-slate-700">Added <span className="font-bold text-slate-900">20 kg Tomatoes</span> (Batch replenishment)</p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-0.5 font-mono">Today 09:30</span>
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5"></div>
                <p className="text-slate-700">Removed <span className="font-bold text-slate-900">5 kg Cheese</span> (Recipe batch depletion)</p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-0.5 font-mono">Yesterday</span>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>
                <p className="text-slate-700">Stock Adjustment logged for <span className="font-bold text-slate-900">Chicken</span> (Spoilage count adjustment)</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: AI Assistant Widget */}
        <div className="space-y-6">

          {/* AI Assistant Widget */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-emerald-500/5 blur-2xl -z-10"></div>

            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Bot size={18} className="text-emerald-500 animate-pulse" /> Inventory Assistant
              </h3>

              <div className="space-y-3 font-semibold text-xs leading-normal">
                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl relative flex flex-col justify-between gap-3">
                  <p className="text-slate-700">Order Tomatoes tomorrow to avoid safety stock exhaustion.</p>
                  <div className="flex items-center gap-2 self-end">
                    <button onClick={() => alert("Suggestion applied")} className="py-1 px-2.5 bg-emerald-500 text-white font-bold rounded-lg text-[9px] shadow-sm">Apply</button>
                    <button onClick={() => alert("Suggestion ignored")} className="py-1 px-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg text-[9px]">Ignore</button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl relative flex flex-col justify-between gap-3">
                  <p className="text-slate-700">Milk batch LOT-A expires in 2 days. Use immediately.</p>
                  <div className="flex items-center gap-2 self-end">
                    <button onClick={() => alert("Suggestion applied")} className="py-1 px-2.5 bg-emerald-500 text-white font-bold rounded-lg text-[9px] shadow-sm">Apply</button>
                    <button onClick={() => alert("Suggestion ignored")} className="py-1 px-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg text-[9px]">Ignore</button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl relative flex flex-col justify-between gap-3">
                  <p className="text-slate-700">Cheese consumption velocity increased by 14% this week.</p>
                  <div className="flex items-center gap-2 self-end">
                    <button onClick={() => alert("Suggestion applied")} className="py-1 px-2.5 bg-emerald-500 text-white font-bold rounded-lg text-[9px] shadow-sm">Apply</button>
                    <button onClick={() => alert("Suggestion ignored")} className="py-1 px-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg text-[9px]">Ignore</button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl relative flex flex-col justify-between gap-3">
                  <p className="text-slate-700">Chicken stock will finish Friday if velocity continues.</p>
                  <div className="flex items-center gap-2 self-end">
                    <button onClick={() => alert("Suggestion applied")} className="py-1 px-2.5 bg-emerald-500 text-white font-bold rounded-lg text-[9px] shadow-sm">Apply</button>
                    <button onClick={() => alert("Suggestion ignored")} className="py-1 px-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg text-[9px]">Ignore</button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl relative flex flex-col justify-between gap-3">
                  <p className="text-slate-700">Reduce potato purchase orders: overstock warning issued.</p>
                  <div className="flex items-center gap-2 self-end">
                    <button onClick={() => alert("Suggestion applied")} className="py-1 px-2.5 bg-emerald-500 text-white font-bold rounded-lg text-[9px] shadow-sm">Apply</button>
                    <button onClick={() => alert("Suggestion ignored")} className="py-1 px-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg text-[9px]">Ignore</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* --- RIGHT SIDE VIEW DETAILS DRAWER --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-md bg-white border-l border-slate-200 h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                    {selectedProduct.category?.name || 'Uncategorized'}
                  </span>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Stats / Details list */}
              <div className="space-y-4 font-semibold text-xs text-slate-600">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Current Stock</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono mt-1 block">
                      {selectedProduct.current_stock} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Min Level</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono mt-1 block">
                      {selectedProduct.reorder_level} {selectedProduct.unit}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Reserved Stock</span>
                    <span className="text-slate-800 font-mono">0.0 {selectedProduct.unit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Incoming Stock</span>
                    <span className="text-slate-800 font-mono">10.0 {selectedProduct.unit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avg. Daily Usage</span>
                    <span className="text-slate-800 font-mono">1.2 {selectedProduct.unit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Supplier</span>
                    <Link href="/suppliers" className="text-emerald-600 hover:text-emerald-700 font-bold">
                      Fresh Farms
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Purchase Price</span>
                    <span className="text-slate-800 font-mono">₹{(selectedProduct.cost_price * 80).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Selling Price</span>
                    <span className="text-slate-800 font-mono">₹{(selectedProduct.selling_price * 80).toFixed(0)}</span>
                  </div>
                </div>

                {/* Stock History mini Chart */}
                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Stock Levels (7 Days)</span>
                  <div className="h-32 w-full bg-slate-50 border border-slate-150 rounded-xl p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockStockHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="miniSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                        <Area type="monotone" dataKey="stock" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#miniSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedProduct(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl text-xs transition-all mt-6"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}

      {/* --- RIGHT SIDE STOCK ADJUSTMENT DRAWER --- */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setAdjustingProduct(null)} />
          <div className="relative w-full max-w-md bg-white border-l border-slate-200 h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Record Stock Movement</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">{adjustingProduct.name}</p>
                </div>
                <button onClick={() => setAdjustingProduct(null)} className="text-slate-400 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleAdjustSubmit} className="space-y-4">

                {/* Movement Type Segmented Tabs */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Movement Type *</span>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, transaction_type: 'STOCK_IN' })}
                      className={`py-2 rounded-lg font-bold text-[10px] cursor-pointer transition-all ${form.transaction_type === 'STOCK_IN'
                        ? 'bg-white text-slate-900 border border-slate-200/60 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      + Add Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, transaction_type: 'STOCK_OUT' })}
                      className={`py-2 rounded-lg font-bold text-[10px] cursor-pointer transition-all ${form.transaction_type === 'STOCK_OUT'
                        ? 'bg-white text-slate-900 border border-slate-200/60 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      - Remove Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, transaction_type: 'ADJUSTMENT' })}
                      className={`py-2 rounded-lg font-bold text-[10px] cursor-pointer transition-all ${form.transaction_type === 'ADJUSTMENT'
                        ? 'bg-white text-slate-900 border border-slate-200/60 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      Correction
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Quantity ({adjustingProduct.unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-250 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    placeholder={`e.g. 50`}
                  />
                </div>

                {form.transaction_type === 'STOCK_IN' && (
                  <div className="grid grid-cols-2 gap-4 p-4.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Batch Code
                      </label>
                      <input
                        type="text"
                        value={form.batch_number}
                        onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-xs text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                        placeholder="e.g. BATCH-A"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={form.expiry_date}
                        onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-white text-xs text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Reason / Notes
                  </label>
                  <input
                    type="text"
                    required
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-250 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                    placeholder="e.g. Spoilage disposal, fresh delivery..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustingProduct(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustMutation.isPending}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    {adjustMutation.isPending ? 'Saving...' : 'Save Movement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
