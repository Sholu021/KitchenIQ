'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  Trash2,
  Plus,
  X,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Coins,
  RefreshCw,
  Search,
  Calendar
} from 'lucide-react';

export default function WastagePage() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((state) => state.role);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Spoilage');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Wastage logs
  const { data: wastageList = [], isLoading: isLoadingWastage, error: wastageError } = useQuery({
    queryKey: ['wastage'],
    queryFn: async () => {
      const res = await apiClient.get('/wastage');
      return res.data;
    }
  });

  // 2. Fetch Products for select input
  const { data: productsData = { items: [] }, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const res = await apiClient.get('/products?limit=100');
      return res.data;
    }
  });

  // 3. Create Wastage Mutation
  const logWastageMutation = useMutation({
    mutationFn: async (payload: { product_id: number; quantity: number; reason: string }) => {
      const res = await apiClient.post('/wastage', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wastage'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setModalOpen(false);
      setProductId('');
      setQuantity('');
      setReason('Spoilage');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to log wastage. Please verify stock levels.');
    }
  });

  // 4. Delete Wastage Mutation (Reverts Stock)
  const deleteWastageMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/wastage/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wastage'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete wastage record.');
    }
  });

  const handleLogWastage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || logWastageMutation.isPending) return;

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg('Please enter a valid quantity greater than zero.');
      return;
    }

    const selectedProd = productsData.items.find((p: any) => p.id === parseInt(productId, 10));
    if (selectedProd && selectedProd.current_stock < qtyNum) {
      setErrorMsg(`Insufficient stock: Only ${selectedProd.current_stock} ${selectedProd.unit} available.`);
      return;
    }

    logWastageMutation.mutate({
      product_id: parseInt(productId, 10),
      quantity: qtyNum,
      reason
    });
  };

  const handleDeleteRecord = (id: number) => {
    if (confirm('Are you sure you want to delete this wastage log? This will REVERT the deducted stock back to inventory.')) {
      deleteWastageMutation.mutate(id);
    }
  };

  // Calculations
  const totalFinancialLoss = wastageList.reduce((acc: number, record: any) => acc + record.cost_loss, 0);
  const totalUnitsWasted = wastageList.length;

  const filteredLogs = wastageList.filter((log: any) => {
    const prodName = log.product?.name?.toLowerCase() || '';
    const rsn = log.reason?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return prodName.includes(query) || rsn.includes(query);
  });

  const reasons = ['Spoilage', 'Spillage', 'Expired', 'Burnt', 'Customer Return', 'Pre-consumer Prep Waste'];

  const canDelete = userRole === 'Owner' || userRole === 'Manager';

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Flame className="text-rose-500 animate-pulse" /> Wastage & Spoilage Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">Record food waste details, audit write-off costs, and automatically decrement batch shelf stock.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="py-3 px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] cursor-pointer"
        >
          <Plus size={16} /> Log Wastage
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f1626] border border-rose-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex items-center gap-5">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-rose-500/5 blur-3xl -z-10"></div>
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Coins size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cumulative Financial Loss</span>
            <span className="text-3xl font-black text-white mt-1 block font-mono">${totalFinancialLoss.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex items-center gap-5">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-3xl -z-10"></div>
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <AlertTriangle size={28} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Wastage Incidents logged</span>
            <span className="text-3xl font-black text-white mt-1 block font-mono">{totalUnitsWasted} logs</span>
          </div>
        </div>
      </div>

      {/* Search & Listing */}
      <div className="bg-[#0f1626] border border-slate-900 rounded-2xl shadow-xl">
        <div className="p-6 border-b border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-base font-bold text-white">Historical Wastage Feed</h3>
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by ingredient or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          </div>
        </div>

        {isLoadingWastage ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="animate-spin inline-block mr-2 text-indigo-400" size={18} />
            Loading wastage database records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No wastage records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-900 bg-slate-950/20">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ingredient</th>
                  <th className="px-6 py-4 font-semibold text-center">Wasted Quantity</th>
                  <th className="px-6 py-4 font-semibold text-center">Sunk Cost Loss</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                  <th className="px-6 py-4 font-semibold"><div className="flex items-center gap-1.5"><Calendar size={13} /> Logged Date</div></th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-white block">{log.product?.name || 'Deleted Product'}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">SKU: {log.product?.sku || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold font-mono text-slate-200">
                      {log.quantity} {log.product?.unit || ''}
                    </td>
                    <td className="px-6 py-4 text-center font-bold font-mono text-rose-400">
                      -${log.cost_loss.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full font-bold text-[10px]">
                        {log.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canDelete ? (
                        <button
                          onClick={() => handleDeleteRecord(log.id)}
                          className="p-2 bg-slate-950 border border-slate-900 text-rose-500 hover:text-rose-400 hover:bg-slate-900 rounded-xl cursor-pointer transition-colors"
                          title="Delete & Revert Stock"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1" title="Manager only">
                          <ShieldAlert size={12} /> Restricted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f1626] border border-slate-900 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-slate-900">
              <h3 className="text-base font-bold text-white">Log Ingredient Wastage</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogWastage} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle size={15} />
                  {errorMsg}
                </div>
              )}

              {/* Product Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Stock Ingredient *</label>
                <select
                  required
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Ingredient --</option>
                  {productsData.items.map((prod: any) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (Stock: {prod.current_stock} {prod.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity Wasted *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Enter numeric value..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3.5 top-3.5 text-xs font-semibold text-slate-500">
                    {productId ? productsData.items.find((p: any) => p.id === parseInt(productId, 10))?.unit : ''}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wastage Reason *</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {reasons.map((rsn) => (
                    <option key={rsn} value={rsn}>{rsn}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 font-semibold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logWastageMutation.isPending}
                  className="py-2.5 px-5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {logWastageMutation.isPending ? 'Logging...' : 'Confirm Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
