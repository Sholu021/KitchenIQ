'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Trash, BookOpen, Clock, Tag, X, Eye, Sparkles, ChefHat } from 'lucide-react';

export default function RecipesPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isReadOnly = role?.toLowerCase() === 'staff';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  // New Recipe Form State
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Array<{ product_id: string; quantity_required: string }>>([
    { product_id: '', quantity_required: '' }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: products = [] } = useQuery({
    queryKey: ['products-list-for-recipe'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 100 } });
      return res.data.items;
    }
  });

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes-list'],
    queryFn: async () => {
      const res = await apiClient.get('/recipes');
      return res.data;
    }
  });

  // Create Recipe Mutation
  const createRecipeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/recipes', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes-list'] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || 'Failed to create recipe.');
    }
  });

  // Delete Recipe Mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes-list'] });
    }
  });

  const resetForm = () => {
    setRecipeName('');
    setDescription('');
    setIngredients([{ product_id: '', quantity_required: '' }]);
    setFormError(null);
  };

  const handleAddIngredientRow = () => {
    setIngredients([...ingredients, { product_id: '', quantity_required: '' }]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!recipeName.trim()) {
      setFormError('Recipe Name is required.');
      return;
    }

    // Validate ingredients
    const items = ingredients.map((ing) => {
      const q = parseFloat(ing.quantity_required);
      return {
        product_id: parseInt(ing.product_id),
        quantity_required: q
      };
    });

    const invalid = items.some((item) => isNaN(item.product_id) || isNaN(item.quantity_required) || item.quantity_required <= 0);
    if (invalid) {
      setFormError('Ensure all ingredients have a valid product and required quantity.');
      return;
    }

    createRecipeMutation.mutate({
      name: recipeName,
      description: description || null,
      ingredients: items
    });
  };

  const handleDeleteRecipe = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the recipe "${name}"?`)) {
      deleteRecipeMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Recipe Book & Margins</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Define constituents, monitor raw cost totals, and calibrate dish prices.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 self-start sm:self-auto"
          >
            <Plus size={16} /> Add Recipe
          </button>
        )}
      </div>

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold tracking-widest uppercase">Retrieving Recipe Book...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-medium bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          No recipes defined. Create recipes to link kitchen sales to ingredient inventory.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe: any) => (
            <div
              key={recipe.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-500 shrink-0">
                      <ChefHat size={15} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 truncate">{recipe.name}</h3>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200/60 hover:border-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 min-h-8 mb-4 font-medium">
                  {recipe.description || 'No preparation instructions logged.'}
                </p>

                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Computed Cost:</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">₹{Number(recipe.cost_price ?? 0).toFixed(2)}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Ingredients ({recipe.ingredients.length})</span>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {recipe.ingredients.slice(0, 3).map((ing: any) => (
                      <div key={ing.id} className="text-xs text-slate-600 font-medium flex items-center justify-between">
                        <span>• {ing.product?.name}</span>
                        <span className="text-slate-400 font-mono font-bold">{ing.quantity_required} {ing.product?.unit}</span>
                      </div>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <div className="text-[10px] text-slate-400 italic mt-1 font-semibold">
                        + {recipe.ingredients.length - 3} more ingredients
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setDetailsModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-emerald-500 hover:text-white border border-slate-200/80 hover:border-emerald-500 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-inner"
                >
                  <Eye size={13} /> View Full Recipe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- CREATE RECIPE MODAL --- */}
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
              <ChefHat size={18} className="text-emerald-500" /> Define New Recipe
            </h3>
            
            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  placeholder="e.g. Cappuccino"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recipe Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold h-16 resize-none"
                  placeholder="Describe recipe preparation or notes..."
                />
              </div>

              {/* Dynamic ingredient selector list */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ingredient Requirements *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Ingredient
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {ingredients.map((ing, index) => {
                    const selectedProduct = products.find((p: any) => p.id.toString() === ing.product_id);
                    return (
                      <div key={index} className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-200 rounded-xl">
                        <div className="flex-1">
                          <select
                            required
                            value={ing.product_id}
                            onChange={(e) => handleIngredientChange(index, 'product_id', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 bg-white text-xs text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                          >
                            <option value="">Select product...</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-28 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                          <input
                            type="number"
                            step="any"
                            required
                            value={ing.quantity_required}
                            placeholder="Qty"
                            onChange={(e) => handleIngredientChange(index, 'quantity_required', e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-900 font-bold text-right focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold font-mono shrink-0">
                            {selectedProduct?.unit || '-'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={ingredients.length === 1}
                          onClick={() => handleRemoveIngredientRow(index)}
                          className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={createRecipeMutation.isPending}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer mt-4"
              >
                {createRecipeMutation.isPending ? 'Defining Recipe...' : 'Define Recipe'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- RECIPE DETAILS VIEW MODAL --- */}
      {detailsModalOpen && selectedRecipe && (
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
                <ChefHat size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Recipe Guide</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{selectedRecipe.name}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">{selectedRecipe.description || 'No preparation instructions logged.'}</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl mb-5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Raw Cost:</span>
              <span className="text-base font-bold text-slate-800 font-mono">₹{Number(selectedRecipe.cost_price ?? 0).toFixed(2)}</span>
            </div>

            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Ingredient Breakdown</span>
              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-200/80 tracking-widest">
                    <tr>
                      <th className="px-4 py-2.5 font-bold">Ingredient Name</th>
                      <th className="px-4 py-2.5 text-right font-bold">Required Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {selectedRecipe.ingredients?.map((ing: any) => (
                      <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{ing.product?.name}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {ing.quantity_required} {ing.product?.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
