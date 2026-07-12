'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  Users,
  Plus,
  X,
  ShieldAlert,
  Activity,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search
} from 'lucide-react';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const currentUserName = useAuthStore((state) => state.userName);
  const currentUserRole = useAuthStore((state) => state.role);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Staff');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Team Members
  const { data: teamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      return res.data;
    }
  });

  // 2. Fetch Audit Logs
  const { data: auditLogs = [], isLoading: isLoadingAudit, refetch: refetchAudit, isRefetching: isRefetchingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/users/audit-logs');
      return res.data;
    }
  });

  // 3. Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('Staff');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to create user. Verify email address.');
    }
  });

  // 4. Update User Role / Status Mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.patch(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to update user.');
    }
  });

  // 5. Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to delete user.');
    }
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || createUserMutation.isPending) return;

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    createUserMutation.mutate({
      full_name: fullName,
      email,
      password,
      role,
      is_active: true
    });
  };

  const handleToggleStatus = (id: number, currentStatus: boolean, name: string) => {
    if (name === currentUserName) {
      alert('Cannot deactivate your own logged-in account.');
      return;
    }
    updateUserMutation.mutate({
      id,
      payload: { is_active: !currentStatus }
    });
  };

  const handleChangeRole = (id: number, newRole: string) => {
    updateUserMutation.mutate({
      id,
      payload: { role: newRole }
    });
  };

  const handleDeleteUser = (id: number, name: string) => {
    if (name === currentUserName) {
      alert('Cannot delete your own logged-in account.');
      return;
    }
    if (confirm(`Are you sure you want to remove ${name} from the organization?`)) {
      deleteUserMutation.mutate(id);
    }
  };

  const isOwner = currentUserRole === 'Owner';
  const isManager = currentUserRole === 'Manager' || isOwner;

  const filteredMembers = teamMembers.filter((m: any) => {
    const name = m.full_name.toLowerCase();
    const mail = m.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || mail.includes(query);
  });

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="text-emerald-500 shrink-0" /> Team & Workspace Members
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Configure role authorizations (RBAC), invite new staff, and monitor system activity logs.</p>
        </div>
        {isManager && (
          <button
            onClick={() => setModalOpen(true)}
            className="py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 self-start sm:self-auto"
          >
            <Plus size={16} /> Add Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT: TEAM LIST PANEL --- */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900">Active Members</h3>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            </div>
          </div>

          {isLoadingTeam ? (
            <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold tracking-widest uppercase">Retrieving Team...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-medium">
              No matching team members found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredMembers.map((member: any) => {
                const isSelf = member.full_name === currentUserName;
                return (
                  <div key={member.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    
                    {/* User profile */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white text-sm shadow-sm shrink-0">
                        {member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{member.full_name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-bold px-2 py-0.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5 block font-medium">{member.email}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      {/* Role selection */}
                      {isOwner && !isSelf && member.role !== 'Owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 bg-white text-xs text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold cursor-pointer"
                        >
                          <option value="Manager">Manager</option>
                          <option value="Staff">Staff</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">
                          {member.role}
                        </span>
                      )}

                      {/* Status switch */}
                      <button
                        onClick={() => handleToggleStatus(member.id, member.is_active, member.full_name)}
                        disabled={!isManager || isSelf || member.role === 'Owner'}
                        className={`text-xs font-bold px-3 py-1 border rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                          member.is_active
                            ? 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100/50'
                            : 'text-slate-400 border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </button>

                      {/* Remove Button */}
                      {isManager && !isSelf && member.role !== 'Owner' && (
                        <button
                          onClick={() => handleDeleteUser(member.id, member.full_name)}
                          disabled={member.role === 'Manager' && !isOwner}
                          className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200/60 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-30"
                          title="Remove user"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- RIGHT: AUDIT LOG FEED --- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col h-[520px] overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-500 shrink-0" size={18} />
              <h3 className="text-lg font-bold text-slate-900">Audit Log Activity</h3>
            </div>
            <button
              onClick={() => refetchAudit()}
              disabled={isRefetchingAudit}
              className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:text-slate-900 hover:border-slate-350 cursor-pointer transition-colors"
            >
              <RefreshCw size={13} className={isRefetchingAudit ? 'animate-spin text-slate-400' : 'text-slate-400'} />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-4 overflow-y-auto divide-y divide-slate-100">
            {isLoadingAudit ? (
              <div className="py-20 flex flex-col items-center gap-2.5 text-slate-400">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold tracking-widest uppercase">Retrieving events...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium text-xs">
                No system events recorded.
              </div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="pt-3.5 first:pt-0 space-y-1">
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700 font-mono uppercase text-[9px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-semibold font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Performed by <strong className="text-slate-700 font-bold">{log.user_name}</strong> on entity {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* CREATE USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-[20px] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-emerald-500" /> Create Workspace User
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle size={15} />
                  {errorMsg}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="e.g. Charlie Staff"
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase block">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="name@kitcheniq.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase block">Password * (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase block">Role Authorization *</label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                >
                  <option value="Staff">Staff (Read-only + stock updates)</option>
                  {isOwner && <option value="Manager">Manager (Full catalog CRUD + purchases)</option>}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
