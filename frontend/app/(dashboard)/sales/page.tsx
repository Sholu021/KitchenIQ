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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Sales Register</h1>
          <p className="text-sm text-slate-400 mt-1">Log menu sales transactions to automatically trigger inventory ingredient deductions.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 self-start md:self-auto"
        >
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {/* Sales List */}
      <div className="bg-[#0f1626] border border-slate-900 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-2 text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-wider">RETRIEVING SALES REGISTER...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No sales recorded yet. Submit a sale to trigger automated ingredient deductions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-900 bg-slate-950/20">
                <tr>
                  <th className="px-6 py-4">Sale ID</th>
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4 text-right font-semibold">Total Amount</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-white"># SALE-{sale.id}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {new Date(sale.sale_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                      ${sale.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenDetails(sale)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer text-xs"
                      >
                        <Eye size={12} /> View Items
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Record Recipe Sale</h3>
            
            {formError && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg whitespace-pre-line">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Menu Items Sold *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {saleItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-slate-950/40 p-2.5 border border-slate-900 rounded-xl">
                      <div className="flex-1">
                        <select
                          required
                          value={item.recipe_id}
                          onChange={(e) => handleItemChange(index, 'recipe_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 text-xs text-white rounded-lg focus:outline-none"
                        >
                          <option value="">Choose recipe...</option>
                          {recipes.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name} (Cost: ${r.cost_price.toFixed(2)})</option>
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
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 text-xs text-white text-right rounded-lg focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={saleItems.length === 1}
                        onClick={() => handleRemoveItemRow(index)}
                        className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={recordSaleMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer mt-4"
              >
                {recordSaleMutation.isPending ? 'Submitting Sale...' : 'Submit Sale & Deduct Inventory'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SALE DETAILS VIEW MODAL --- */}
      {detailsModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setDetailsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="mb-5">
              <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
                <ShoppingBag size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Sale Record</span>
              </div>
              <h3 className="text-lg font-bold text-white">Sale # SALE-{selectedSale.id}</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">{new Date(selectedSale.sale_date).toLocaleString()}</p>
            </div>

            <div className="border border-slate-900 rounded-xl overflow-hidden mb-5">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/20 text-slate-400 font-bold uppercase border-b border-slate-900">
                  <tr>
                    <th className="px-4 py-2.5">Recipe Item</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {selectedSale.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold text-white">{item.recipe?.name}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-indigo-300">
                        {item.quantity} x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-950/30 border-t border-slate-900 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400 uppercase">Gross Revenue:</span>
                <span className="text-sm font-black text-emerald-400 font-mono">${selectedSale.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
