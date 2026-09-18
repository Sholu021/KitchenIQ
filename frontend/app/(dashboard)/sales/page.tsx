'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Plus, Trash, DollarSign, Calendar, ShoppingBag, Eye, X } from 'lucide-react';

export default function SalesPage() {
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // New Sale Form State
  const [saleItems, setSaleItems] = useState<Array<{ recipe_id: string; quantity: string }>>([
    { recipe_id: '', quantity: '1' }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes-list-for-sales'],
    queryFn: async () => {
      const res = await apiClient.get('/recipes');
      return res.data;
    }
  });

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-list'],
    queryFn: async () => {
      const res = await apiClient.get('/sales');
      return res.data;
    }
  });

  // Record Sale Mutation
  const recordSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/sales', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || 'Failed to submit sale. Verify stock availability.');
    }
  });

  const resetForm = () => {
    setSaleItems([{ recipe_id: '', quantity: '1' }]);
    setFormError(null);
  };

  const handleAddItemRow = () => {
    setSaleItems([...saleItems, { recipe_id: '', quantity: '1' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...saleItems];
    updated[index] = { ...updated[index], [field]: value };
    setSaleItems(updated);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate items
    const items = saleItems.map((item) => {
      const q = parseInt(item.quantity, 10);
      return {
        recipe_id: parseInt(item.recipe_id),
        quantity: q
      };
    });

    const invalid = items.some((item) => isNaN(item.recipe_id) || isNaN(item.quantity) || item.quantity <= 0);
    if (invalid) {
      setFormError('Ensure all rows have a valid recipe and positive quantity.');
      return;
    }

    recordSaleMutation.mutate({ items });
  };

  const handleOpenDetails = (sale: any) => {
    setSelectedSale(sale);
    setDetailsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sales Register</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Log menu sales transactions to automatically trigger inventory ingredient deductions.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 self-start sm:self-auto"
        >
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {/* Sales List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold tracking-widest uppercase">Retrieving Sales Register...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium">
            No sales recorded yet. Submit a sale to trigger automated ingredient deductions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Sale ID</th>
                  <th className="px-6 py-4 font-bold">Transaction Date</th>
                  <th className="px-6 py-4 text-right font-bold">Total Amount</th>
                  <th className="px-6 py-4 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900"># SALE-{sale.id}</td>
                    <td className="px-6 py-4 text-slate-500 font-semibold text-xs">
                      {new Date(sale.sale_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                      ₹{Number(sale.total_amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenDetails(sale)}
                        className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200/60 hover:border-emerald-200 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer text-xs font-bold"
                      >
                        <Eye size={13} /> View Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- RECORD SALE MODAL --- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[20px] p-6 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingBag size={18} className="text-emerald-500" /> Record Recipe Sale
            </h3>
            
            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl whitespace-pre-line">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Menu Items Sold *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {saleItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-200 rounded-xl">
                      <div className="flex-1">
                        <select
                          required
                          value={item.recipe_id}
                          onChange={(e) => handleItemChange(index, 'recipe_id', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 bg-white text-xs text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                        >
                          <option value="">Choose recipe...</option>
                          {recipes.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name} (Cost: ₹{Number(r.cost_price ?? 0).toFixed(2)})</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          placeholder="Qty"
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white text-xs text-slate-900 text-right rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={saleItems.length === 1}
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
                disabled={recordSaleMutation.isPending}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer mt-4"
              >
                {recordSaleMutation.isPending ? 'Submitting Sale...' : 'Submit Sale & Deduct Inventory'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SALE DETAILS VIEW MODAL --- */}
      {detailsModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-[20px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setDetailsModalOpen(false)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="mb-5">
              <div className="flex items-center gap-1.5 text-emerald-500 mb-1.5">
                <ShoppingBag size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Sale Record</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Sale # SALE-{selectedSale.id}</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{new Date(selectedSale.sale_date).toLocaleString()}</p>
            </div>

            <div className="border border-slate-200/80 rounded-xl overflow-hidden mb-5 shadow-sm">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-200/80 tracking-widest">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">Recipe Item</th>
                    <th className="px-4 py-2.5 text-right font-bold">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {selectedSale.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{item.recipe?.name}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                        {item.quantity} x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                <span className="font-bold text-slate-400 uppercase">Gross Revenue:</span>
                <span className="text-sm font-bold text-slate-800 font-mono">₹{Number(selectedSale.total_amount ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
