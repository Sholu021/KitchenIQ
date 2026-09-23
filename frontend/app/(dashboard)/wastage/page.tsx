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
  Coins,
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
  const { data: wastageList = [], isLoading: isLoadingWastage } = useQuery({
    queryKey: ['wastage'],
    queryFn: async () => {
      const res = await apiClient.get('/wastage');
      return res.data;
    }
  });

  // 2. Fetch Products for select input
  const { data: productsData = { items: [] } } = useQuery({
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Flame className="text-rose-500 shrink-0" /> Wastage & Spoilage Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Record food waste details, audit write-off costs, and automatically decrement batch shelf stock.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="py-3 px-5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/10 self-start sm:self-auto"
        >
          <Plus size={16} /> Log Wastage
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500">
            <Coins size={28} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Cumulative Financial Loss</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block font-mono">-${totalFinancialLoss.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500">
            <AlertTriangle size={28} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Wastage Incidents Logged</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block font-mono">{totalUnitsWasted} logs</span>
          </div>
        </div>
      </div>

      {/* Search & Listing */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Historical Wastage Feed</h3>
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by ingredient or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
          </div>
        </div>

        {isLoadingWastage ? (
          <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold tracking-widest uppercase">Retrieving Wastage logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium">
            No wastage records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Ingredient</th>
                  <th className="px-6 py-4 font-bold text-center">Wasted Quantity</th>
                  <th className="px-6 py-4 font-bold text-center">Sunk Cost Loss</th>
                  <th className="px-6 py-4 font-bold">Reason</th>
                  <th className="px-6 py-4 font-bold"><div className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400" /> Logged Date</div></th>
                  {canDelete && <th className="px-6 py-4 font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{log.product?.name || 'Deleted Product'}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">SKU: {log.product?.sku || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold font-mono text-slate-800">
                      {log.quantity} {log.product?.unit || ''}
                    </td>
                    <td className="px-6 py-4 text-center font-bold font-mono text-rose-500">
                      -${log.cost_loss.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200/50 text-rose-700 rounded-full font-bold text-[10px]">
                        {log.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    {canDelete && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteRecord(log.id)}
                          className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200/60 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete & Revert Stock"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-[20px] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Flame size={18} className="text-rose-500" /> Log Ingredient Wastage
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogWastage} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle size={15} />
                  {errorMsg}
                </div>
              )}

              {/* Product Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase block">Select Stock Ingredient *</label>
                <select
                  required
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
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
                <label className="text-xs font-bold text-slate-400 uppercase block">Quantity Wasted *</label>
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
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                    {productId ? productsData.items.find((p: any) => p.id === parseInt(productId, 10))?.unit : ''}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase block">Wastage Reason *</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                >
                  {reasons.map((rsn) => (
                    <option key={rsn} value={rsn}>{rsn}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logWastageMutation.isPending}
                  className="py-2.5 px-5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-450 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-rose-500/10"
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
