'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

const BASE_TO_INR_RATE = 80;

export default function InventoryPage() {
  const queryClient = useQueryClient();
  
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get('batch_id');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [inventoryHealth, setInventoryHealth] = useState(100);

  // Drawer states
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any | null>(null);

  const [ledgerProduct, setLedgerProduct] = useState<any | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState("ALL");
  const [exportSuccess, setExportSuccess] = useState(false);
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");

  // Expanded batches state (accordion)
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // Adjustment Form State (inside drawer)
  const [form, setForm] = useState({
    transaction_type: 'STOCK_IN',
    quantity: '',
    batch_id: null as number | null,
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
   
  const {
    data: ledgerData,
    isLoading: ledgerLoading,
  } = useQuery({
    queryKey: ['inventory-ledger', ledgerProduct?.id],
    queryFn: async () => {
      if (!ledgerProduct?.id) return null;

      const res = await apiClient.get(
        `/batches/products/${ledgerProduct.id}/ledger`
      );

      return res.data;
    },
    enabled: !!ledgerProduct?.id,
  });
  const {
    data: aiInsightsData,
    isLoading: aiInsightsLoading,
  } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/ai-insights");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const {
    data: inventoryHealthData,
    isLoading: inventoryHealthLoading,
  } = useQuery({
    queryKey: ["inventory-health"],
    queryFn: async () => {
      const res = await apiClient.get("/analytics/inventory-health");
      return res.data;
    },
  });
  
  const filteredLedgerTransactions =
    ledgerData?.transactions?.filter((transaction: any) => {
      if (
        ledgerFilter !== "ALL" &&
        transaction.transaction_type !== ledgerFilter
      ) {
        return false;
      }

      const transactionDate = transaction.created_at
        ? new Date(transaction.created_at)
        : null;

      if (ledgerDateFrom && transactionDate) {
        const fromDate = new Date(`${ledgerDateFrom}T00:00:00`);

        if (transactionDate < fromDate) {
          return false;
        }
      }

      if (ledgerDateTo && transactionDate) {
        const toDate = new Date(`${ledgerDateTo}T23:59:59.999`);

        if (transactionDate > toDate) {
          return false;
        }
      }

      return true;
    }) ?? [];

  const ledgerSummary = filteredLedgerTransactions.reduce(
    (
      summary: {
        stockIn: number;
        stockOut: number;
        net: number;
      },
      transaction: any
    ) => {
      const quantity = Number(transaction.quantity ?? 0);

      if (quantity > 0) {
        summary.stockIn += quantity;
      } else if (quantity < 0) {
        summary.stockOut += Math.abs(quantity);
      }

      summary.net += quantity;

      return summary;
    },
    {
      stockIn: 0,
      stockOut: 0,
      net: 0,
    }
  );
  
  const {
    data: recentInventoryTransactions = [],
    isLoading: recentInventoryTransactionsLoading,
  } = useQuery({
    queryKey: ["recent-inventory-transactions"],
    queryFn: async () => {
      const res = await apiClient.get("/batches/transactions/recent");
      return res.data;
    },
  });

  const {
    data: selectedProductLedger,
    isLoading: selectedProductLedgerLoading,
  } = useQuery({
    queryKey: ["product-stock-history", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;

      const res = await apiClient.get(
        `/batches/products/${selectedProduct.id}/ledger`
      );

      return res.data;
    },
    enabled: !!selectedProduct?.id,
  });
  
  const selectedProductStockHistory =
    selectedProductLedger?.transactions
      ?.slice()
      .reverse()
      .slice(-7)
      .map((transaction: any) => ({
        day: transaction.created_at
          ? new Date(transaction.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })
          : "Unknown",
        stock: Number(transaction.balance ?? 0),
      })) ?? [];

  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const res = await apiClient.get("/batches");

      return res.data;
    },
  });
  useEffect(() => {
    if (
      !batchIdParam ||
      !Array.isArray(batches) ||
      batches.length === 0
    ) {
      return;
    }

    const batch = batches.find(
      (b: any) => String(b.id) === String(batchIdParam)
    );

    if (!batch) {
      return;
    }

    setSelectedBatchId(batch.id);

    setExpandedProducts((prev) => ({
      ...prev,
      [batch.product_id]: true,
    }));
  }, [batchIdParam, batches]);

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
      batch_id: null,
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
      batch_id: form.batch_id,
      batch_number: form.batch_number || null,
      expiry_date: form.expiry_date || null,
    };

    adjustMutation.mutate(payload);
  };

  const toggleProductAccordion = (productId: number) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleExportLedger = () => {
    if (!ledgerProduct || !filteredLedgerTransactions.length) {
      return;
    }

    const headers = [
      "Date",
      "Transaction Type",
      "Batch",
      "Expiry Date",
      "Quantity",
      "Balance",
      "Notes",
      "User",
      "Purchase Order",
      "Reference",
    ];

    const rows = filteredLedgerTransactions.map((transaction: any) => [
      transaction.created_at
        ? new Date(transaction.created_at).toLocaleString("en-IN")
        : "",
      transaction.transaction_type,
      transaction.batch_number || "",
      transaction.expiry_date || "",
      transaction.quantity,
      transaction.balance ?? "",
      transaction.notes || "",
      transaction.created_by_name || "",
      transaction.purchase_order_id || "",
      transaction.reference || "",
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value: unknown) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    const dateSuffix =
      ledgerDateFrom || ledgerDateTo
        ? `_${ledgerDateFrom || "start"}_to_${ledgerDateTo || "end"}`
        : "";

    link.download = `${ledgerProduct.name.replace(/\s+/g, "_")}_ledger${dateSuffix}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setExportSuccess(true);

    setTimeout(() => {
      setExportSuccess(false);
    }, 2500);
  };

  // 1. Calculate values for summary cards dynamically
  const totalIngredientsCount = products.length || 248;

  const totalValuation = products.reduce(
    (acc: number, p: any) => acc + (p.current_stock * p.cost_price),
    0
  );
  
  const lowStockCount = products.filter(
    (p: any) => p.current_stock > 0 && p.current_stock <= p.reorder_level
  ).length;

  const outOfStockCount = products.filter(
    (p: any) => p.current_stock === 0
  ).length;

  const expiringCount =
    (alerts.expiring_7?.length || 0) +
    (alerts.expiring_30?.length || 0);

  const expiredCount = alerts.expired?.length || 0;
  const expiredValue = Number(alerts.expired_value || 0);
  const expiring30Value = Number(alerts.expiring_30_value || 0);

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
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Ingredients</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">{totalIngredientsCount}</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Value</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">₹{(totalValuation * BASE_TO_INR_RATE).toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Low Stock</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">{lowStockCount}</span>
          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 rounded px-1.5 py-0.5 mt-2 self-start">Attention</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Expiring Soon
          </span>

          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
            {expiringCount}
          </span>

          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 rounded px-1.5 py-0.5 mt-2 self-start">
            ₹{expiring30Value.toLocaleString("en-IN")} at risk
          </span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Expired Stock
          </span>

          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">
            {expiredCount}
          </span>

          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100/50 rounded px-1.5 py-0.5 mt-2 self-start">
            ₹{expiredValue.toLocaleString("en-IN")} at risk
          </span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Out of Stock</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2 font-mono">{outOfStockCount}</span>
        </div>
        <div className="bg-white border border-slate-200/85 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inventory Health</span>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-8 h-8 rounded-full border-4 ${
                (inventoryHealthData?.health_score ?? inventoryHealth) >= 80
                  ? "border-emerald-500"
                  : (inventoryHealthData?.health_score ?? inventoryHealth) >= 60
                  ? "border-amber-500"
                  : "border-rose-500"
              }`}
            ></div>
            <span
              className={`text-xl font-extrabold ${
                (inventoryHealthData?.health_score ?? inventoryHealth) >= 80
                  ? "text-emerald-600"
                  : (inventoryHealthData?.health_score ?? inventoryHealth) >= 60
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {inventoryHealthLoading
                ? "..."
                : `${inventoryHealthData?.health_score ?? inventoryHealth}%`}
            </span>
          </div>
          <span
            className={`text-[9px] font-bold rounded px-1.5 py-0.5 mt-2 self-start ${
              (inventoryHealthData?.health_score ?? inventoryHealth) >= 80
                ? "text-emerald-600 bg-emerald-50 border border-emerald-100/50"
                : (inventoryHealthData?.health_score ?? inventoryHealth) >= 60
                ? "text-amber-600 bg-amber-50 border border-amber-100/50"
                : "text-rose-600 bg-rose-50 border border-rose-100/50"
            }`}
          >
            {inventoryHealthLoading
              ? "Calculating"
              : (inventoryHealthData?.health_score ?? inventoryHealth) >= 80
              ? "Healthy"
              : (inventoryHealthData?.health_score ?? inventoryHealth) >= 60
              ? "Needs Attention"
              : "Critical"}
          </span> 
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
                              ₹{(p.cost_price * BASE_TO_INR_RATE).toFixed(0)}/{p.unit}
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
                                  type="button"
                                  onClick={() => setLedgerProduct(p)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="View inventory ledger"
                                >
                                  <FileText size={15} />
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
                                          className={`border rounded-xl p-4 flex items-center justify-between transition-all ${
                                            selectedBatchId === b.id
                                              ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm"
                                              : "bg-white border-slate-200"
                                          }`}
                                        >
                                          <div>
                                            <p className="font-bold text-slate-900">
                                              Batch {b.batch_number}
                                            </p>

                                            <p className="text-xs text-slate-500">
                                              Expires {new Date(b.expiry_date).toLocaleDateString()}
                                            </p>
                                          </div>

                                          <div className="text-right flex flex-col items-end gap-2">
                                            <div>
                                              <p className="font-bold text-emerald-600">
                                                {b.remaining_quantity} {p.unit}
                                              </p>

                                              <p className="text-xs text-slate-400">
                                                Remaining
                                              </p>
                                            </div>

                                            {selectedBatchId === b.id && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setAdjustingProduct(p);

                                                  setForm({
                                                    transaction_type: 'STOCK_OUT',
                                                    quantity: '',
                                                    batch_id: b.id,
                                                    batch_number: b.batch_number || '',
                                                    expiry_date: b.expiry_date || '',
                                                    notes: 'FEFO usage',
                                                  });
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-colors"
                                              >
                                                Use This Batch
                                              </button>
                                            )}
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
              {recentInventoryTransactionsLoading ? (
                <div className="py-4 text-center text-slate-400">
                  Loading recent movements...
                </div>
              ) : recentInventoryTransactions.length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  No recent inventory movements.
                </div>
              ) : (
                recentInventoryTransactions.slice(0, 5).map((transaction: any) => {
                  const isStockIn = transaction.transaction_type === "STOCK_IN";
                  const isStockOut = transaction.transaction_type === "STOCK_OUT";

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-start gap-4"
                    >
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-0.5 font-mono">
                        {transaction.created_at
                          ? new Date(transaction.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Unknown"}
                      </span>

                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                          isStockIn
                            ? "bg-emerald-500"
                            : isStockOut
                            ? "bg-rose-500"
                            : "bg-blue-500"
                        }`}
                      ></div>

                      <p className="text-slate-700">
                        {isStockIn
                          ? "Added"
                          : isStockOut
                          ? "Removed"
                          : "Adjusted"}{" "}
                        <span className="font-bold text-slate-900">
                          {Math.abs(Number(transaction.quantity)).toLocaleString("en-IN")}{" "}
                          {transaction.product_name}
                        </span>
                        {transaction.notes && (
                          <span className="text-slate-400">
                            {" "}
                            ({transaction.notes})
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
        {/* Ledger Drawer */}
        {ledgerProduct && (
          <div className="fixed inset-0 z-50 flex justify-end">

            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
              onClick={() => {
                setLedgerProduct(null);
                setLedgerFilter("ALL");
                setLedgerDateFrom("");
                setLedgerDateTo("");
                setExportSuccess(false);
              }}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto">

              {/* Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                      Inventory Ledger
                    </p>

                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                      {ledgerProduct.name}
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      {filteredLedgerTransactions.length} shown ·{" "}
                      {ledgerData?.transactions?.length ?? 0} total movements
                    </p>
                  </div>

                  <div className="flex items-center gap-1">

                    <button
                      type="button"
                      onClick={handleExportLedger}
                      disabled={ledgerLoading || !filteredLedgerTransactions.length}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        ledgerLoading
                          ? "Loading ledger"
                          : !filteredLedgerTransactions.length
                          ? "No transactions to export"
                          : "Export ledger"
                      }
                    >
                      <Download size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLedgerProduct(null);
                        setLedgerFilter("ALL");
                        setLedgerDateFrom("");
                        setLedgerDateTo("");
                        setExportSuccess(false);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                      title="Close ledger"
                    >
                      <X size={18} />
                    </button>

                  </div>

                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Current Stock
                    </span>

                    <p className="text-lg font-extrabold text-slate-900 mt-1 font-mono">
                      {ledgerData?.current_stock ??
                        ledgerProduct.current_stock ??
                        0}{" "}
                      {ledgerData?.unit ?? ledgerProduct.unit ?? ""}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Transactions
                    </span>

                    <p className="text-lg font-extrabold text-slate-900 mt-1 font-mono">
                      {ledgerData?.transactions?.length ?? 0}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Stock In
                    </span>

                    <p className="text-lg font-extrabold text-emerald-600 mt-1 font-mono">
                      +{Number(ledgerSummary.stockIn).toLocaleString("en-IN")}{" "}
                      {ledgerData?.unit ?? ledgerProduct.unit ?? ""}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Stock Out
                    </span>

                    <p className="text-lg font-extrabold text-rose-600 mt-1 font-mono">
                      -{Number(ledgerSummary.stockOut).toLocaleString("en-IN")}{" "}
                      {ledgerData?.unit ?? ledgerProduct.unit ?? ""}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {ledgerFilter === "ALL" && !ledgerDateFrom && !ledgerDateTo
                        ? "Net Movement"
                        : "Filtered Net"}
                    </span>

                    <p
                      className={`text-lg font-extrabold mt-1 font-mono ${
                        ledgerSummary.net > 0
                          ? "text-emerald-600"
                          : ledgerSummary.net < 0
                          ? "text-rose-600"
                          : "text-slate-600"
                      }`}
                    >
                      {ledgerSummary.net > 0 ? "+" : ""}
                      {Number(ledgerSummary.net).toLocaleString("en-IN")}{" "}
                      {ledgerData?.unit ?? ledgerProduct.unit ?? ""}
                    </p>
                  </div>

                </div>

              </div>

              {/* Transactions */}
              <div className="p-6">

                {ledgerLoading ? (
                  <div className="text-center py-12 text-sm text-slate-400">
                    Loading inventory history...
                  </div>
                ) : !filteredLedgerTransactions.length ? (
                  <div className="text-center py-12 text-sm text-slate-400">
                    No {ledgerFilter === "ALL"
                      ? "inventory transactions"
                      : ledgerFilter.replace("_", " ").toLowerCase()} found.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {["ALL", "STOCK_IN", "STOCK_OUT", "ADJUSTMENT"].map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setLedgerFilter(filter)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                            ledgerFilter === filter
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {filter === "ALL"
                            ? `All (${ledgerData?.transactions?.length ?? 0})`
                            : `${filter.replace("_", " ")} (${
                                ledgerData?.transactions?.filter(
                                  (transaction: any) =>
                                    transaction.transaction_type === filter
                                ).length ?? 0
                              })`}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          From
                        </label>

                        <input
                          type="date"
                          value={ledgerDateFrom}
                          onChange={(e) => setLedgerDateFrom(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          To
                        </label>

                        <input
                          type="date"
                          value={ledgerDateTo}
                          onChange={(e) => setLedgerDateTo(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLedgerFilter("ALL");
                        setLedgerDateFrom("");
                        setLedgerDateTo("");
                      }}
                      className="px-3 py-2 mt-5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold transition-colors"
                    >
                      Clear Filters
                    </button>
                    </div>

                    <div className="space-y-3">

                      {filteredLedgerTransactions.map((transaction: any) => {

                        const isStockIn =
                          transaction.transaction_type === 'STOCK_IN';

                        const isStockOut =
                          transaction.transaction_type === 'STOCK_OUT';

                        return (
                          <div
                            key={transaction.id}
                            className="border border-slate-200 rounded-xl p-4 bg-white hover:bg-slate-50 transition-colors"
                          >

                            <div className="flex items-start justify-between gap-4">

                              {/* Transaction information */}
                              <div className="min-w-0">

                                <div className="flex items-center gap-2">

                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                                      isStockIn
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : isStockOut
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}
                                  >
                                    {transaction.transaction_type.replace(
                                      '_',
                                      ' '
                                    )}
                                  </span>

                                  <span className="text-[10px] text-slate-400">
                                    #{transaction.id}
                                  </span>

                                </div>

                                {/* Batch */}
                                <div className="mt-3">

                                  <p className="text-xs font-bold text-slate-800">
                                    {transaction.batch_number
                                      ? `Batch ${transaction.batch_number}`
                                      : 'No batch assigned'}
                                  </p>

                                  {transaction.expiry_date && (
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Expires:{' '}
                                      {new Date(
                                        transaction.expiry_date
                                      ).toLocaleDateString('en-IN')}
                                    </p>
                                  )}

                                </div>

                                {/* Source / Notes */}
                                <div className="mt-2 space-y-1">

                                  {transaction.notes && (
                                    <p className="text-[10px] text-slate-500">
                                      {transaction.notes}
                                    </p>
                                  )}

                                  {transaction.purchase_order_id && (
                                    <p className="text-[10px] text-slate-400">
                                      Purchase Order #{transaction.purchase_order_id}
                                    </p>
                                  )}

                                  {transaction.reference && (
                                    <p className="text-[10px] text-slate-400">
                                      Reference: {transaction.reference}
                                    </p>
                                  )}

                                  {transaction.created_by_name ? (
                                    <p className="text-[10px] text-slate-400">
                                      By {transaction.created_by_name}
                                    </p>
                                  ) : transaction.created_by ? (
                                    <p className="text-[10px] text-slate-400">
                                      User #{transaction.created_by}
                                    </p>
                                  ) : null}

                                </div>

                                {/* Date */}
                                <p className="text-[10px] text-slate-400 mt-2">
                                  {transaction.created_at
                                    ? new Date(
                                        transaction.created_at
                                      ).toLocaleString('en-IN')
                                    : 'Unknown date'}
                                </p>

                              </div>

                              {/* Quantity + Balance */}
                              <div className="flex gap-5 shrink-0">

                                {/* Quantity */}
                                <div className="text-right">
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                                    Quantity
                                  </p>

                                  <p
                                    className={`text-base font-extrabold font-mono ${
                                      transaction.quantity > 0
                                        ? 'text-emerald-600'
                                        : transaction.quantity < 0
                                        ? 'text-rose-600'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {transaction.quantity > 0 ? '+' : ''}
                                    {Number(transaction.quantity).toLocaleString('en-IN')}
                                  </p>

                                  <p className="text-[9px] text-slate-400 mt-1">
                                    {ledgerData?.unit ?? ledgerProduct.unit ?? ''}
                                  </p>
                                </div>

                                {/* Balance */}
                                <div className="text-right">
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                                    Balance
                                  </p>

                                  <p className="text-base font-extrabold text-slate-900 font-mono">
                                    {Number(transaction.balance ?? 0).toLocaleString('en-IN')}
                                  </p>

                                  <p className="text-[9px] text-slate-400 mt-1">
                                    {ledgerData?.unit ?? ledgerProduct.unit ?? ''}
                                  </p>
                                </div>

                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
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
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  {aiInsightsLoading
                    ? "AI INSIGHT"
                    : aiInsightsData?.insights?.[0]?.title ?? "AI INSIGHT"}
                </p>
                  <p className="text-slate-700">
                    {aiInsightsLoading
                      ? "Analyzing inventory..."
                      : aiInsightsData?.insights?.[0]?.message ??
                        "No AI insight available."}
                  </p>
                  <div className="flex items-center gap-2 self-end">
                    <button
                      type="button"
                      disabled
                      className="py-1 px-2.5 bg-emerald-500/40 text-white font-bold rounded-lg text-[9px] cursor-not-allowed"
                    >
                      Apply
                    </button>

                    <button
                      type="button"
                      disabled
                      className="py-1 px-2.5 bg-white border border-slate-200 text-slate-400 font-bold rounded-lg text-[9px] cursor-not-allowed"
                    >
                      Ignore
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl relative flex flex-col justify-between gap-3">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  {aiInsightsLoading
                    ? "AI INSIGHT"
                    : aiInsightsData?.insights?.[1]?.title ?? "AI INSIGHT"}
                </p>  
                  <p className="text-slate-700">
                    {aiInsightsLoading
                      ? "Analyzing inventory..."
                      : aiInsightsData?.insights?.[1]?.message ??
                        "No second AI insight available."}
                  </p>
                  <div className="flex items-center gap-2 self-end">
                    <button
                      type="button"
                      disabled
                      className="py-1 px-2.5 bg-emerald-500/40 text-white font-bold rounded-lg text-[9px] cursor-not-allowed"
                    >
                      Apply
                    </button>

                    <button
                      type="button"
                      disabled
                      className="py-1 px-2.5 bg-white border border-slate-200 text-slate-400 font-bold rounded-lg text-[9px] cursor-not-allowed"
                    >
                      Ignore
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl relative flex flex-col justify-between gap-3">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  {aiInsightsLoading
                    ? "AI INSIGHT"
                    : aiInsightsData?.insights?.[2]?.title ?? "AI INSIGHT"}
                </p>
                  <p className="text-slate-700">
                    {aiInsightsLoading
                      ? "Analyzing inventory..."
                      : aiInsightsData?.insights?.[2]?.message ??
                        "No third AI insight available."}
                    </p>
                  <div className="flex items-center gap-2 self-end">
                    <button onClick={() => alert("Suggestion applied")} className="py-1 px-2.5 bg-emerald-500 text-white font-bold rounded-lg text-[9px] shadow-sm">Apply</button>
                    <button onClick={() => alert("Suggestion ignored")} className="py-1 px-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg text-[9px]">Ignore</button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    No additional AI insight
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    KitchenIQ currently has {aiInsightsData?.count ?? 0} active insights.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    AI status
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Insights are generated from the current business data.
                  </p>
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
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      Current Stock
                    </span>
                    <span className="text-base font-extrabold text-slate-800 font-mono mt-1 block">
                      {selectedProduct.current_stock} {selectedProduct.unit}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      Min Level
                    </span>
                    <span className="text-base font-extrabold text-slate-800 font-mono mt-1 block">
                      {selectedProduct.reorder_level} {selectedProduct.unit}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Reserved Stock</span>
                    <span className="text-slate-400 font-mono">
                      Not available
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Incoming Stock</span>
                    <span className="text-slate-400 font-mono">
                      Not available
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avg. Daily Usage</span>
                    <span className="text-slate-400 font-mono">
                      Not available
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Supplier</span>
                    <span className="text-slate-400 font-mono">
                      Not available
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Purchase Price</span>
                    <span className="text-slate-800 font-mono">
                      ₹{(selectedProduct.cost_price * BASE_TO_INR_RATE).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Selling Price</span>
                    <span className="text-slate-800 font-mono">
                      ₹{(selectedProduct.selling_price * BASE_TO_INR_RATE).toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Stock History mini Chart */}
                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Stock Levels (7 Days)
                  </span>

                  <div className="h-32 w-full bg-slate-50 border border-slate-150 rounded-xl p-2">
                    {selectedProductLedgerLoading ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                        Loading stock history...
                      </div>
                    ) : selectedProductStockHistory.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                        No stock history available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={112} minWidth={0}>
                        <AreaChart
                          data={selectedProductStockHistory}
                          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="miniSales" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.15}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <XAxis
                            dataKey="day"
                            stroke="#94a3b8"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                          />

                          <YAxis
                            stroke="#94a3b8"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                          />

                          <Area
                            type="monotone"
                            dataKey="stock"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#miniSales)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
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
