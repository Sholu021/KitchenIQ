'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { AlertCircle, Calendar, Plus, RefreshCw, X } from 'lucide-react';
import { Boxes } from 'lucide-react';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  // Modal and Tab states
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [activeAlertTab, setActiveAlertTab] = useState<'expired' | '7days' | '30days'>('expired');

  // Adjustment Form State
  const [form, setForm] = useState({
    product_id: '',
    transaction_type: 'STOCK_IN',
    quantity: '',
    batch_number: '',
    expiry_date: '',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: productsData } = useQuery({
    queryKey: ['all-products-for-select'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return res.data.items;
    }
  });

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await apiClient.get('/batches');
      return res.data;
    }
  });

  const { data: alerts = { expired: [], expiring_7: [], expiring_30: [] }, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['batch-alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/batches/alerts');
      return res.data;
    }
  });

  // Adjust Mutation
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
      setAdjustModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to submit adjustment.');
    }
  });

  const resetForm = () => {
    setForm({
      product_id: '',
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

    if (!form.product_id) {
      setError('Please select a product.');
      return;
    }

    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    const payload: any = {
      product_id: parseInt(form.product_id),
      quantity: qty,
      transaction_type: form.transaction_type,
      notes: form.notes || null,
      batch_number: form.batch_number || null,
      expiry_date: form.expiry_date || null
    };

    adjustMutation.mutate(payload);
  };

  const alertTabItems = [
    { id: 'expired', label: 'Already Expired', data: alerts.expired, color: 'text-rose-400 border-rose-500/20 bg-rose-500/5' },
    { id: '7days', label: 'Expiring in 7 Days', data: alerts.expiring_7, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
    { id: '30days', label: 'Expiring in 30 Days', data: alerts.expiring_30, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' }
  ];

  const activeAlertList = activeAlertTab === 'expired' 
    ? alerts.expired 
    : activeAlertTab === '7days' 
      ? alerts.expiring_7 
      : alerts.expiring_30;

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Stock Movement & Batches</h1>
          <p className="text-sm text-slate-400 mt-1">Track expiry batches, log manual inventory adjustments, and view waste reports.</p>
        </div>
        <button
          onClick={() => setAdjustModalOpen(true)}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 self-start md:self-auto"
        >
          <Plus size={16} /> Record Stock Movement
        </button>
      </div>

      {/* Expiry Alerts Panels */}
      <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-rose-500" /> Dashboard Expiry Warnings
        </h2>

        {/* Tab triggers */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/40 border border-slate-900 rounded-xl mb-6">
          {alertTabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAlertTab(tab.id as any)}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeAlertTab === tab.id
                  ? 'bg-slate-900 text-white border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] ${
                tab.data.length > 0 ? 'bg-red-500/15 border-red-500/35 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                {tab.data.length}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeAlertList.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Excellent! No batches fall into this alert category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlertList.map((batch: any) => (
              <div
                key={batch.id}
                className="bg-[#0b0f19] border border-slate-900 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden"
              >
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <Calendar size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{batch.product?.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-mono">Lot: {batch.batch_number}</p>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="font-semibold text-slate-300">
                      Qty: {batch.quantity} {batch.product?.unit}
                    </span>
                    <span className="text-red-400 font-bold">
                      Expires: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batches Table */}
      <div className="bg-[#0f1626] border border-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-900 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Boxes size={20} className="text-indigo-400" /> Active Inventory Batches
          </h2>
        </div>

        {isLoadingBatches ? (
          <div className="py-20 flex flex-col items-center gap-2 text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-wider">RETRIEVING BATCHES...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No active batches in stock. Create stock movements or receive purchase orders to add inventory batches.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-900 bg-slate-950/20">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Batch Number</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4 text-right">Quantity In Stock</th>
                  <th className="px-6 py-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {batches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{b.product?.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-300">{b.batch_number}</td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {b.expiry_date ? (
                        <span className={new Date(b.expiry_date) < new Date() ? 'text-red-400 font-bold' : 'text-slate-300'}>
                          {new Date(b.expiry_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-500">No Expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-400">
                      {b.quantity} <span className="text-xs text-slate-500">{b.product?.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADJUSTMENT MODAL --- */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setAdjustModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Record Stock Movement</h3>
            
            {error && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Product *
                </label>
                <select
                  required
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose a product...</option>
                  {productsData?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || 'N/A'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Movement Type *
                  </label>
                  <select
                    value={form.transaction_type}
                    onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none"
                  >
                    <option value="STOCK_IN">STOCK IN (+)</option>
                    <option value="STOCK_OUT">STOCK OUT (-)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (+/-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              {form.transaction_type === 'STOCK_IN' && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-950/50 border border-slate-900 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Batch Code
                    </label>
                    <input
                      type="text"
                      value={form.batch_number}
                      onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-xs text-white rounded-lg focus:outline-none"
                      placeholder="e.g. MILK-LOT-A"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-xs text-white rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Adjustment Reason / Notes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none"
                  placeholder="e.g. Damaged inventory disposal"
                />
              </div>

              <button
                type="submit"
                disabled={adjustMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer mt-4"
              >
                {adjustMutation.isPending ? 'Submitting Adjustment...' : 'Record Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
