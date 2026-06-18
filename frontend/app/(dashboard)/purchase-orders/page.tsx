'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Trash, Check, X, Clipboard, ArrowRight, Eye, RefreshCw } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isReadOnly = role?.toLowerCase() === 'staff';

  const [statusFilter, setStatusFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  // New PO Form State
  const [supplierId, setSupplierId] = useState('');
  const [poItems, setPoItems] = useState<Array<{ product_id: string; quantity: string; unit_price: string }>>([
    { product_id: '', quantity: '', unit_price: '' }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-list-for-po'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers');
      return res.data;
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-list-for-po'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return res.data.items;
    }
  });

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders', {
        params: statusFilter ? { status: statusFilter } : undefined
      });
      return res.data;
    }
  });

  // Mutation for PO creation
  const createPOMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/purchase-orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || 'Failed to create purchase order.');
    }
  });

  // Mutation for PO status update
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiClient.patch(`/purchase-orders/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      if (selectedPO) {
        // Refresh details modal if open
        const updated = purchaseOrders.find((po: any) => po.id === selectedPO.id);
        if (updated) setSelectedPO(updated);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to update status.');
    }
  });

  const resetForm = () => {
    setSupplierId('');
    setPoItems([{ product_id: '', quantity: '', unit_price: '' }]);
    setFormError(null);
  };

  const handleAddItemRow = () => {
    setPoItems([...poItems, { product_id: '', quantity: '', unit_price: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto populate unit cost if product changed
    if (field === 'product_id') {
      const prod = products.find((p: any) => p.id.toString() === value);
      if (prod) {
        updated[index].unit_price = prod.cost_price.toString();
      }
    }

    setPoItems(updated);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierId) {
      setFormError('Please select a supplier.');
      return;
    }

    // Validate items
    const items = poItems.map((item) => {
      const q = parseFloat(item.quantity);
      const p = parseFloat(item.unit_price);
      return {
        product_id: parseInt(item.product_id),
        quantity: q,
        unit_price: p
      };
    });

    const invalid = items.some((item) => isNaN(item.product_id) || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unit_price) || item.unit_price < 0);
    if (invalid) {
      setFormError('Ensure all items have a valid product, quantity, and unit price.');
      return;
    }

    createPOMutation.mutate({
      supplier_id: parseInt(supplierId),
      items
    });
  };

  const handleUpdateStatus = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleOpenDetails = (po: any) => {
    setSelectedPO(po);
    setDetailsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'SENT':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'RECEIVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CANCELLED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-slate-900 border-slate-800 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Purchase Orders (PO)</h1>
          <p className="text-sm text-slate-400 mt-1">Order ingredients from vendors, track status, and receive bulk stock.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 self-start md:self-auto"
          >
            <Plus size={16} /> Draft PO
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-950/40 border border-slate-900 rounded-xl self-start max-w-lg">
        {['', 'PENDING', 'SENT', 'RECEIVED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === status
                ? 'bg-slate-900 text-white border border-slate-800'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {status === '' ? 'All Orders' : status}
          </button>
        ))}
      </div>

      {/* PO List */}
      <div className="bg-[#0f1626] border border-slate-900 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-2 text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-wider">RETRIEVING PURCHASE ORDERS...</p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No purchase orders matching filters. Create a new purchase order draft to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-900 bg-slate-950/20">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {purchaseOrders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-white"># PO-{po.id}</td>
                    <td className="px-6 py-4 font-semibold">{po.supplier?.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${getStatusBadge(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                      ${po.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(po)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs"
                        >
                          <Eye size={12} /> View Items
                        </button>
                        {!isReadOnly && po.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(po.id, 'SENT')}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs"
                          >
                            <ArrowRight size={12} /> Send Vendor
                          </button>
                        )}
                        {!isReadOnly && po.status === 'SENT' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(po.id, 'RECEIVED')}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs"
                            >
                              <Check size={12} /> Receive Stock
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(po.id, 'CANCELLED')}
                              className="p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs"
                            >
                              <X size={12} /> Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CREATE PO MODAL --- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Create Purchase Order Draft</h3>
            
            {formError && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Supplier Vendor *
                </label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose supplier...</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email || 'No Email'})</option>
                  ))}
                </select>
              </div>

              {/* Items row builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Order Items List *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-slate-950/40 p-3 border border-slate-900 rounded-xl">
                      <div className="flex-1">
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 text-xs text-white rounded-lg focus:outline-none"
                        >
                          <option value="">Choose product...</option>
                          {products.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || 'N/A'})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          required
                          value={item.quantity}
                          placeholder="Quantity"
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 text-xs text-white text-right rounded-lg focus:outline-none"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          required
                          value={item.unit_price}
                          placeholder="Unit Cost"
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 text-xs text-white text-right rounded-lg focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={poItems.length === 1}
                        onClick={() => handleRemoveItemRow(index)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={createPOMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer"
              >
                {createPOMutation.isPending ? 'Creating Draft PO...' : 'Create Draft Purchase Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- PO DETAILS VIEW MODAL --- */}
      {detailsModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setDetailsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="mb-6">
              <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full ${getStatusBadge(selectedPO.status)}`}>
                {selectedPO.status}
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Purchase Order # PO-{selectedPO.id}</h3>
              <p className="text-xs text-slate-400 mt-1">Supplier: {selectedPO.supplier?.name}</p>
            </div>

            <div className="border border-slate-900 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/30 text-slate-400 font-bold uppercase border-b border-slate-900">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {selectedPO.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold text-white">{item.product?.name}</td>
                      <td className="px-4 py-3 text-right font-mono">{item.quantity} {item.product?.unit}</td>
                      <td className="px-4 py-3 text-right font-mono">${item.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-indigo-300">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-950/20 border-t border-slate-900 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400 uppercase">Grand Total:</span>
                <span className="text-sm font-black text-emerald-400">${selectedPO.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick action helper in details view */}
            {!isReadOnly && selectedPO.status === 'SENT' && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedPO.id, 'RECEIVED');
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check size={14} /> Confirm Stocks Received
                </button>
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedPO.id, 'CANCELLED');
                  }}
                  className="py-2 px-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-950/20 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel PO
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
