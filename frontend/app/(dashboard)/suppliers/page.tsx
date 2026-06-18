'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Plus, Search, Edit, Trash, Mail, Phone, MapPin, X } from 'lucide-react';

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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Suppliers Wholesalers</h1>
          <p className="text-sm text-slate-400 mt-1">Manage food vendors, contact channels, and distributor profiles.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenCreateModal}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 self-start md:self-auto"
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
          className="w-full pl-10 pr-4 py-2.5 bg-[#0f1626] border border-slate-900 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-2 text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono tracking-wider">RETRIEVING SUPPLIERS...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-[#0f1626] border border-slate-900 rounded-2xl">
          No suppliers found. Create a supplier to start drafting Purchase Orders.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((sup: any) => (
            <div
              key={sup.id}
              className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-base font-bold text-white truncate">{sup.name}</h3>
                  {!isReadOnly && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(sup)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                        className="p-1.5 bg-slate-900 hover:bg-red-900/20 text-rose-500 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 text-xs text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-indigo-400 shrink-0" />
                    <span className="truncate">{sup.email || 'No email specified'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-indigo-400 shrink-0" />
                    <span>{sup.phone || 'No phone specified'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{sup.address || 'No address specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- SUPPLIER FORM MODAL --- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0c1222] border border-slate-900 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
            </h3>
            
            {error && (
              <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Arabica Roast Co."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none"
                  placeholder="e.g. +1 555 123-456"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none"
                  placeholder="orders@supplier.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Street Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm text-white rounded-lg focus:outline-none h-20"
                  placeholder="e.g. 100 Wholesaler Drive, City"
                />
              </div>

              <button
                type="submit"
                disabled={saveSupplierMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer mt-2"
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
