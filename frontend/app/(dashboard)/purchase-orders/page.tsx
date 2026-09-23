'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Trash, Check, X, Eye, ShoppingBag, Send } from 'lucide-react';

export default function PurchaseOrdersPage() {
  console.log("PurchaseOrdersPage rendered");

  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isReadOnly = role?.toLowerCase() === 'staff';

  const [statusFilter, setStatusFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  // New PO Form State
  const [supplierId, setSupplierId] = useState('');
  const [poItems, setPoItems] = useState<Array<{
    product_id: string;
    quantity: string;
    unit_price: string;
    batch_number: string;
    expiry_date: string;
  }>>([
  {
    product_id: '',
    quantity: '',
    unit_price: '',
    batch_number: '',
    expiry_date: ''
  }
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

  console.log("PurchaseOrdersPage rendered");
  console.log("Purchase Orders:", purchaseOrders);

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
      console.error("Full error:", err);
      console.error("Message:", err.message);
      console.error("Code:", err.code);
      console.error("Response:", err.response);
      console.error("Request:", err.request);

      setFormError(err.message || "Failed to create purchase order.");
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
    },
  });
  const receivePOMutation = useMutation({
    mutationFn: async (id: number) => {
      const po = purchaseOrders.find((p: any) => p.id === id);

      if (!po) {
        throw new Error("Purchase order not found.");
      }

      const missingReceivingData = po.items?.some(
        (item: any) => !item.batch_number || !item.expiry_date
      );

      if (missingReceivingData) {
        throw new Error(
          "Batch number and expiry date are required for every item before receiving stock."
        );
      }

      const payload = {
        items: po.items.map((item: any) => ({
          purchase_order_item_id: item.id,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
      };

      const res = await apiClient.post(
        `/purchase-orders/${id}/receive`,
        payload
      );

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["batches"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard-summary"],
      });
    },

    onError: (err: any) => {
      alert(err.response?.data?.detail || err.message || "Receive failed");
    },
  });


  const resetForm = () => {
    setSupplierId('');
    setPoItems([
      {
        product_id: '',
        quantity: '',
        unit_price: '',
        batch_number: '',
        expiry_date: ''
      }
    ]);
    setFormError(null);
  };

  const handleAddItemRow = () => {
    setPoItems([
  ...poItems,
  {
    product_id: '',
    quantity: '',
    unit_price: '',
    batch_number: '',
    expiry_date: ''
  }
]);
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
        unit_price: p,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null
       };
     });

    const invalid = items.some((item) => isNaN(item.product_id) || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unit_price) || item.unit_price < 0);
    if (invalid) {
      setFormError('Ensure all items have a valid product, quantity, and unit price.');
      return;
    }

    console.log("========== CREATE PO ==========");
    console.log("PO ITEMS STATE:", poItems);
    console.log("ITEMS PAYLOAD:", items);

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
      case 'DRAFT':
        return 'bg-amber-50 text-amber-700 border-amber-200/50';
      case 'SENT':
        return 'bg-blue-50 text-blue-700 border-blue-200/50';
      case 'RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-700 border-slate-200/50';
      default:
        return 'bg-slate-100 border-transparent text-slate-500';
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Purchase Orders (PO)</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Order ingredients from vendors, track status, and receive bulk stock.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 self-start sm:self-auto"
          >
            <Plus size={16} /> Draft PO
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl max-w-lg">
        {['', 'DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === status
                ? 'bg-white text-slate-900 border border-slate-200/80 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {status === '' ? 'All Orders' : status}
          </button>
        ))}
      </div>

      {/* PO List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold tracking-widest uppercase">Retrieving Purchase Orders...</p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium">
            No purchase orders matching filters. Create a new purchase order draft to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">PO Number</th>
                  <th className="px-6 py-4 font-bold">Supplier</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 text-right font-bold">Total Amount</th>
                  <th className="px-6 py-4 font-bold">Created Date</th>
                  <th className="px-6 py-4 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {purchaseOrders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900"># PO-{po.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{po.supplier?.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 border rounded-full ${getStatusBadge(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                      ₹{Number(po.total_amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-semibold text-xs">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(po)}
                          className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200/60 hover:border-emerald-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs font-bold"
                        >
                          <Eye size={13} /> View Items
                        </button>
                        {!isReadOnly && po.status === 'DRAFT' && (
                          <button
                            onClick={() => handleUpdateStatus(po.id, 'SENT')}
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs font-bold shadow-sm shadow-emerald-500/10"
                          >
                            <Send size={13} /> Send Vendor
                          </button>
                        )}
                        {!isReadOnly && po.status === 'SENT' && (
                          <>
                            <button
                              onClick={() => receivePOMutation.mutate(po.id)}
                              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs font-bold shadow-sm shadow-emerald-500/10"
                            >
                              <Check size={13} /> {receivePOMutation.isPending ? 'Receiving...' : 'Receive Stock'}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(po.id, 'CANCELLED')}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs font-bold"
                            >
                              <X size={13} /> Cancel
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-[20px] p-6 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingBag size={18} className="text-emerald-500" /> Create Purchase Order Draft
            </h3>
            
            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Supplier Vendor *
                </label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Order Items List *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 border border-slate-200 rounded-xl">
                      <div className="flex-1">
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 bg-white text-xs text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
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
                          placeholder="Qty"
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white text-xs text-slate-900 text-right rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                        />
                      </div>

                      <div className="w-28 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">₹</span>
                        <input
                          type="number"
                          step="any"
                          required
                          value={item.unit_price}
                          placeholder="Price"
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          className="w-full bg-transparent text-xs text-slate-900 text-right focus:outline-none font-bold"
                        />
                      </div>

                      <div className="w-40">
                        <input
                          type="text"
                          placeholder="Batch Number"
                          value={item.batch_number}
                          onChange={(e) =>
                            handleItemChange(index, "batch_number", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div className="w-40">
                        <input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) =>
                            handleItemChange(index, "expiry_date", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={poItems.length === 1}
                        onClick={() => handleRemoveItemRow(index)}
                        className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer transition-colors"
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
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                {createPOMutation.isPending ? 'Creating Draft PO...' : 'Create Draft Purchase Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- PO DETAILS VIEW MODAL --- */}
      {detailsModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[20px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setDetailsModalOpen(false)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="mb-6">
              <span className={`text-[9px] font-bold px-2.5 py-0.5 border rounded-full ${getStatusBadge(selectedPO.status)}`}>
                {selectedPO.status}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2.5">Purchase Order # PO-{selectedPO.id}</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Supplier Vendor: {selectedPO.supplier?.name}</p>
            </div>

            <div className="border border-slate-200/80 rounded-xl overflow-hidden mb-6 shadow-sm">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-200/80 tracking-widest">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">Product</th>
                    <th className="px-4 py-2.5 text-right font-bold">Qty</th>
                    <th className="px-4 py-2.5 text-right font-bold">Unit Price</th>
                    <th className="px-4 py-2.5 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {selectedPO.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{item.product?.name}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{item.quantity} {item.product?.unit}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{Number(item.unit_price ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                        ₹{(Number(item.quantity ?? 0) * Number(item.unit_price ?? 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                <span className="font-bold text-slate-400 uppercase">Grand Total:</span>
                <span className="text-sm font-bold text-slate-800">₹{Number(selectedPO.total_amount ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {selectedPO.status === 'RECEIVED' && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-700">
                Stock received and inventory updated successfully.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
