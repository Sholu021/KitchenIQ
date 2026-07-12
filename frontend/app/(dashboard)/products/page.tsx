'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Search, Filter, Edit, Trash, ChevronLeft, ChevronRight, X, FolderPlus, Sparkles, CheckCircle2, ChevronRightSquare, ArrowRight } from 'lucide-react';

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
  
  // Multi-step form state
  const [formStep, setFormStep] = useState(1);
  
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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
    setFormStep(1);
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
    setFormStep(1);
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

  const handleNextStep = () => {
    if (formStep === 1) {
      if (!prodForm.name.trim()) {
        setProductError('Product name is required.');
        return;
      }
      if (!prodForm.unit.trim()) {
        setProductError('Unit of measure is required.');
        return;
      }
      setProductError(null);
      setFormStep(2);
    } else if (formStep === 2) {
      if (prodForm.cost_price < 0 || prodForm.selling_price < 0 || prodForm.reorder_level < 0) {
        setProductError('Values cannot be negative.');
        return;
      }
      setProductError(null);
      setFormStep(3);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Products Registry</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Manage ingredients, packaging, unit prices, and categories.</p>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="py-3 px-4 bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <FolderPlus size={16} /> + Category
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value === '' ? '' : parseInt(e.target.value));
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Filter size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold tracking-widest uppercase">Retrieving Ingredients...</p>
          </div>
        ) : !productsData || productsData.items.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium">
            No products found in database. Create some products to start managing stock.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-bold">Product Name</th>
                    <th className="px-6 py-4 font-bold">SKU</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 text-right font-bold">In Stock</th>
                    <th className="px-6 py-4 text-right font-bold">Reorder Point</th>
                    <th className="px-6 py-4 text-right font-bold">Cost Price</th>
                    <th className="px-6 py-4 text-right font-bold">Selling Price</th>
                    {!isReadOnly && <th className="px-6 py-4 text-center font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {productsData.items.map((prod: any) => {
                    const isLow = prod.current_stock <= prod.reorder_level;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{prod.name}</span>
                            {isLow && (
                              <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200/40 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-1 w-max">
                                ⚠️ Low Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{prod.sku || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold">
                            {prod.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold">
                          <span className={isLow ? 'text-amber-500' : 'text-slate-800'}>
                            {prod.current_stock}
                          </span>{' '}
                          <span className="text-xs text-slate-400 font-sans font-medium">{prod.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400">
                          {prod.reorder_level} <span className="text-xs text-slate-400 font-sans font-medium">{prod.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">${prod.cost_price.toFixed(4)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">${prod.selling_price.toFixed(2)}</td>
                        {!isReadOnly && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(prod)}
                                className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-xl border border-slate-200/60 hover:border-emerald-200 transition-colors cursor-pointer"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl border border-slate-200/60 hover:border-rose-200 transition-colors cursor-pointer"
                              >
                                <Trash size={13} />
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
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>
                Showing {page * limit + 1} - {Math.min((page + 1) * limit, productsData.total)} of{' '}
                {productsData.total} items
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={(page + 1) * limit >= productsData.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[20px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setCategoryModalOpen(false)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FolderPlus size={18} className="text-emerald-500" /> Create New Category
            </h3>
            {categoryError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                {categoryError}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  placeholder="e.g. Dairy, Spices, Bakery"
                />
              </div>
              <button
                onClick={() => createCategoryMutation.mutate(newCategoryName)}
                disabled={createCategoryMutation.isPending}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRODUCT FORM MODAL (CREATE / EDIT MULTI-STEP) --- */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-[20px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setProductModalOpen(false)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            
            {/* Steps indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${formStep >= 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>Basic</span>
              <ChevronLeft size={10} className="rotate-180 text-slate-300" />
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${formStep >= 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>Pricing</span>
              <ChevronLeft size={10} className="rotate-180 text-slate-300" />
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${formStep >= 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>Review</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
            </h3>

            {productError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                {productError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* STEP 1: BASIC DETAILS */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={prodForm.name}
                      onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                      placeholder="e.g. Arabica Beans"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        SKU / Barcode
                      </label>
                      <input
                        type="text"
                        value={prodForm.sku}
                        onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                        placeholder="e.g. COF-ARA-1KG"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Unit of Measure *
                      </label>
                      <input
                        type="text"
                        required
                        value={prodForm.unit}
                        onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                        placeholder="e.g. g, ml, pcs, kg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Category
                    </label>
                    <select
                      value={prodForm.category_id}
                      onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* STEP 2: COST & PRICING */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Cost Price ($) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={prodForm.cost_price}
                        onChange={(e) => setProdForm({ ...prodForm, cost_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Selling Price ($) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={prodForm.selling_price}
                        onChange={(e) => setProdForm({ ...prodForm, selling_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Reorder Alert Level ({prodForm.unit}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={prodForm.reorder_level}
                      onChange={(e) => setProdForm({ ...prodForm, reorder_level: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Review <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & SAVE */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 text-slate-700 text-sm font-semibold">
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">Name:</span>
                      <span className="text-slate-900">{prodForm.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">SKU:</span>
                      <span className="text-slate-900 font-mono text-xs">{prodForm.sku || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-slate-900">
                        {categories.find((c: any) => c.id.toString() === prodForm.category_id)?.name || 'Uncategorized'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">Unit:</span>
                      <span className="text-slate-900">{prodForm.unit}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-400">Cost / Selling:</span>
                      <span className="text-slate-900">${prodForm.cost_price.toFixed(2)} / ${prodForm.selling_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reorder Alert at:</span>
                      <span className="text-slate-900">{prodForm.reorder_level} {prodForm.unit}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={saveProductMutation.isPending}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {saveProductMutation.isPending ? 'Saving Product...' : 'Save Product'}
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
