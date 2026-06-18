'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Trash, BookOpen, Clock, Tag, X, Eye } from 'lucide-react';

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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Recipe Book & Margins</h1>
          <p className="text-sm text-slate-400 mt-1">Define menu item recipes, constituent ingredient loads, and compute costs.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 self-start md:self-auto"
          >
            <Plus size={16} /> Add Recipe
          </button>
        )}
      </div>

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-2 text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono tracking-wider">RETRIEVING RECIPE BOOK...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-[#0f1626] border border-slate-900 rounded-2xl">
          No recipes defined. Create recipes to link kitchen sales to ingredient inventory.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe: any) => (
            <div
              key={recipe.id}
              className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between"
            >
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500/20"></div>

              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-base font-bold text-white truncate">{recipe.name}</h3>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                      className="p-1.5 bg-slate-900 hover:bg-red-950/20 text-rose-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 min-h-8 mb-4">
                  {recipe.description || 'No description provided.'}
                </p>

                <div className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Computed Cost:</span>
                  <span className="text-sm font-black text-indigo-400 font-mono">${recipe.cost_price.toFixed(2)}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ingredients ({recipe.ingredients.length})</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {recipe.ingredients.slice(0, 3).map((ing: any) => (
                      <div key={ing.id} className="text-xs text-slate-300 flex items-center justify-between">
                        <span>• {ing.product?.name}</span>
                        <span className="text-slate-400 font-mono font-medium">{ing.quantity_required} {ing.product?.unit}</span>
                      </div>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <div className="text-[10px] text-slate-500 italic mt-1">
                        + {recipe.ingredients.length - 3} more ingredients
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setDetailsModalOpen(true);
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800/50"
                >
                  <Eye size={12} /> View Full Recipe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- CREATE RECIPE MODAL --- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Define New Recipe</h3>
            
            {formError && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Cappuccino"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Recipe Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none h-16"
                  placeholder="Describe recipe preparation or notes..."
                />
              </div>

              {/* Dynamic ingredient selector list */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ingredient Requirements *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Ingredient
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {ingredients.map((ing, index) => {
                    const selectedProduct = products.find((p: any) => p.id.toString() === ing.product_id);
                    return (
                      <div key={index} className="flex items-center gap-3 bg-slate-950/40 p-2.5 border border-slate-900 rounded-xl">
                        <div className="flex-1">
                          <select
                            required
                            value={ing.product_id}
                            onChange={(e) => handleIngredientChange(index, 'product_id', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-850 text-xs text-white rounded-lg focus:outline-none"
                          >
                            <option value="">Select product...</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-28 flex items-center gap-1.5 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1">
                          <input
                            type="number"
                            step="any"
                            required
                            value={ing.quantity_required}
                            placeholder="Qty"
                            onChange={(e) => handleIngredientChange(index, 'quantity_required', e.target.value)}
                            className="w-full bg-transparent text-xs text-white text-right focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {selectedProduct?.unit || '-'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={ingredients.length === 1}
                          onClick={() => handleRemoveIngredientRow(index)}
                          className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={createRecipeMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer mt-4"
              >
                {createRecipeMutation.isPending ? 'Defining Recipe...' : 'Define Recipe'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- RECIPE DETAILS VIEW MODAL --- */}
      {detailsModalOpen && selectedRecipe && (
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
                <BookOpen size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Recipe Guide</span>
              </div>
              <h3 className="text-lg font-bold text-white">{selectedRecipe.name}</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{selectedRecipe.description || 'No instructions provided.'}</p>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl mb-5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Raw Cost:</span>
              <span className="text-base font-black text-indigo-400 font-mono">${selectedRecipe.cost_price.toFixed(2)}</span>
            </div>

            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Full Ingredient Breakdown</span>
              <div className="border border-slate-900 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/20 text-slate-400 font-bold uppercase border-b border-slate-900">
                    <tr>
                      <th className="px-4 py-2.5">Ingredient Name</th>
                      <th className="px-4 py-2.5 text-right">Required Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {selectedRecipe.ingredients?.map((ing: any) => (
                      <tr key={ing.id}>
                        <td className="px-4 py-3 font-semibold text-white">{ing.product?.name}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-indigo-300">
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
