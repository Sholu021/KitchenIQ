'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Search, Edit, Trash, Mail, Phone, MapPin, X, Landmark } from 'lucide-react';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isReadOnly = role?.toLowerCase() === 'staff';

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Query Suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers', {
        params: search ? { search } : undefined
      });
      return res.data;
    }
  });

  // Create / Edit Mutation
  const saveSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingSupplier) {
        const res = await apiClient.patch(`/suppliers/${editingSupplier.id}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/suppliers', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setModalOpen(false);
      setEditingSupplier(null);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to save supplier.');
    }
  });

  // Delete Mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      address: ''
    });
    setError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (supplier: any) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Supplier Name is required.');
      return;
    }

    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null
    };

    saveSupplierMutation.mutate(payload);
  };

  const handleDeleteSupplier = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      deleteSupplierMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Suppliers Directory</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Manage wholesale vendors, communication details, and supplier profiles.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenCreateModal}
            className="py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 self-start sm:self-auto"
          >
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="max-w-md relative">
        <input
          type="text"
          placeholder="Search suppliers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
        />
        <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold tracking-widest uppercase">Retrieving Suppliers...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-medium bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          No suppliers found. Create a supplier to start drafting Purchase Orders.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((sup: any) => (
            <div
              key={sup.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-500 shrink-0">
                      <Landmark size={15} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 truncate">{sup.name}</h3>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(sup)}
                        className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg border border-slate-200/60 hover:border-emerald-200 transition-colors cursor-pointer"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200/60 hover:border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3.5 text-xs text-slate-600 font-semibold pt-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <Mail size={13} />
                    </div>
                    <span className="truncate">{sup.email || 'No email specified'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <Phone size={13} />
                    </div>
                    <span>{sup.phone || 'No phone specified'}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                      <MapPin size={13} />
                    </div>
                    <span className="line-clamp-2 leading-relaxed">{sup.address || 'No address specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- SUPPLIER FORM MODAL --- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[20px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Landmark size={18} className="text-emerald-500" />
              {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  placeholder="e.g. Arabica Roast Co."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  placeholder="e.g. +1 555 123-456"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  placeholder="orders@supplier.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Street Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold h-20 resize-none"
                  placeholder="e.g. 100 Wholesaler Drive, City"
                />
              </div>

              <button
                type="submit"
                disabled={saveSupplierMutation.isPending}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer mt-2"
              >
                {saveSupplierMutation.isPending ? 'Saving Supplier...' : 'Save Supplier'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
