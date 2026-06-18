'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Search, Filter, Edit, Trash, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isReadOnly = role?.toLowerCase() === 'staff';

  // State filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const limit = 10;

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  
  // Create / Edit category state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Edit product state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // Product form state
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    unit: 'pcs',
    reorder_level: 0,
    cost_price: 0,
    selling_price: 0,
    category_id: ''
  });
  const [productError, setProductError] = useState<string | null>(null);

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/products/categories');
      return res.data;
    }
  });

  // Fetch Products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, categoryId, page],
    queryFn: async () => {
      const params: any = {
        skip: page * limit,
        limit: limit
      };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      
      const res = await apiClient.get('/products', { params });
      return res.data;
    }
  });

  // Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post('/products/categories', { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryModalOpen(false);
      setNewCategoryName('');
      setCategoryError(null);
    },
    onError: (err: any) => {
      setCategoryError(err.response?.data?.detail || 'Failed to create category.');
    }
  });

  // Product Mutation (Create / Edit)
  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingProduct) {
        const res = await apiClient.patch(`/products/${editingProduct.id}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/products', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductModalOpen(false);
      setEditingProduct(null);
      resetProductForm();
    },
    onError: (err: any) => {
      setProductError(err.response?.data?.detail || 'Failed to save product.');
    }
  });

  // Product Delete Mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const resetProductForm = () => {
    setProdForm({
      name: '',
      sku: '',
      unit: 'pcs',
      reorder_level: 0,
      cost_price: 0,
      selling_price: 0,
      category_id: ''
    });
    setProductError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    resetProductForm();
    setProductModalOpen(true);
  };

  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
    setProdForm({
      name: product.name,
      sku: product.sku || '',
      unit: product.unit,
      reorder_level: product.reorder_level,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      category_id: product.category_id?.toString() || ''
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProductError(null);

    const payload: any = {
      name: prodForm.name,
      sku: prodForm.sku || null,
      unit: prodForm.unit,
      reorder_level: parseFloat(prodForm.reorder_level as any),
      cost_price: parseFloat(prodForm.cost_price as any),
      selling_price: parseFloat(prodForm.selling_price as any),
      category_id: prodForm.category_id ? parseInt(prodForm.category_id) : null
    };

    saveProductMutation.mutate(payload);
  };

  const handleDeleteProduct = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteProductMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Products Registry</h1>
          <p className="text-sm text-slate-400 mt-1">Manage food ingredients, packaging materials, prices, and categories.</p>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              + Category
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f1626] border border-slate-900 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
        </div>

        <div className="relative">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value === '' ? '' : parseInt(e.target.value));
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f1626] border border-slate-900 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Filter size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#0f1626] border border-slate-900 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-2 text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono tracking-wider">RETRIEVING INGREDIENTS...</p>
          </div>
        ) : !productsData || productsData.items.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No products found in database. Create some products to start managing stock.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-900 bg-slate-950/20">
                  <tr>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">In Stock</th>
                    <th className="px-6 py-4 text-right">Reorder Point</th>
                    <th className="px-6 py-4 text-right">Cost Price</th>
                    <th className="px-6 py-4 text-right">Selling Price</th>
                    {!isReadOnly && <th className="px-6 py-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {productsData.items.map((prod: any) => {
                    const isLow = prod.current_stock <= prod.reorder_level;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">
                          <div className="flex flex-col">
                            {prod.name}
                            {isLow && (
                              <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-0.5">
                                ⚠️ Low Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{prod.sku || '-'}</td>
                        <td className="px-6 py-4 text-indigo-300">{prod.category?.name || 'Uncategorized'}</td>
                        <td className="px-6 py-4 text-right font-mono font-semibold">
                          <span className={isLow ? 'text-amber-400' : 'text-slate-200'}>
                            {prod.current_stock}
                          </span>{' '}
                          <span className="text-xs text-slate-500">{prod.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400">
                          {prod.reorder_level} <span className="text-xs text-slate-500">{prod.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">${prod.cost_price.toFixed(4)}</td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-400">${prod.selling_price.toFixed(2)}</td>
                        {!isReadOnly && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(prod)}
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-indigo-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                className="p-2 bg-slate-900 hover:bg-red-900/20 text-rose-500 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="px-6 py-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>
                Showing {page * limit + 1} - {Math.min((page + 1) * limit, productsData.total)} of{' '}
                {productsData.total} items
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={(page + 1) * limit >= productsData.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* --- CATEGORY CREATION MODAL --- */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setCategoryModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Create New Category</h3>
            {categoryError && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {categoryError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Dairy, Spices, Bakery"
                />
              </div>
              <button
                onClick={() => createCategoryMutation.mutate(newCategoryName)}
                disabled={createCategoryMutation.isPending}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRODUCT FORM MODAL (CREATE / EDIT) --- */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setProductModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
            </h3>
            {productError && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {productError}
              </div>
            )}
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Arabica Beans"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    SKU / Barcode
                  </label>
                  <input
                    type="text"
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. COF-ARA-1KG"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Unit of Measure *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.unit}
                    onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. g, ml, pcs, kg"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Reorder Alert Level *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={prodForm.reorder_level}
                    onChange={(e) => setProdForm({ ...prodForm, reorder_level: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={prodForm.category_id}
                    onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Cost Price *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={prodForm.cost_price}
                    onChange={(e) => setProdForm({ ...prodForm, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={prodForm.selling_price}
                    onChange={(e) => setProdForm({ ...prodForm, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saveProductMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer mt-4"
              >
                {saveProductMutation.isPending ? 'Saving Product...' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
