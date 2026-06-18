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
  UserCheck,
  Activity,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  EyeOff
} from 'lucide-react';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.organizationId); // wait, currentUserId should be matching? Let's check where the logged in user info is.
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
  const { data: teamMembers = [], isLoading: isLoadingTeam, refetch: refetchTeam } = useQuery({
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="text-indigo-400" /> Team & Workspace Members
          </h1>
          <p className="text-sm text-slate-400 mt-1">Configure role authorizations (RBAC), invite new staff, and monitor system activity logs.</p>
        </div>
        {isManager && (
          <button
            onClick={() => setModalOpen(true)}
            className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] cursor-pointer"
          >
            <Plus size={16} /> Add Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT: TEAM LIST PANEL --- */}
        <div className="lg:col-span-2 bg-[#0f1626] border border-slate-900 rounded-2xl shadow-xl overflow-hidden">
          
          <div className="p-6 border-b border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">Active Members</h3>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            </div>
          </div>

          {isLoadingTeam ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="animate-spin inline-block mr-2 text-indigo-400" size={18} />
              Loading team directory...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No matching team members found.
            </div>
          ) : (
            <div className="divide-y divide-slate-900/60">
              {filteredMembers.map((member: any) => {
                const isSelf = member.full_name === currentUserName;
                return (
                  <div key={member.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/10 transition-colors">
                    
                    {/* User profile */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm">
                        {member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{member.full_name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5 block">{member.email}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      {/* Role selection */}
                      {isOwner && !isSelf && member.role !== 'Owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                        >
                          <option value="Manager">Manager</option>
                          <option value="Staff">Staff</option>
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                          {member.role}
                        </span>
                      )}

                      {/* Status switch */}
                      <button
                        onClick={() => handleToggleStatus(member.id, member.is_active, member.full_name)}
                        disabled={!isManager || isSelf || member.role === 'Owner'}
                        className={`text-xs font-bold px-3 py-1 border rounded-xl transition-all ${
                          member.is_active
                            ? 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10'
                            : 'text-slate-400 border-slate-800 bg-slate-950 hover:bg-slate-900'
                        } cursor-pointer disabled:opacity-50`}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </button>

                      {/* Remove Button */}
                      {isManager && !isSelf && member.role !== 'Owner' && (
                        <button
                          onClick={() => handleDeleteUser(member.id, member.full_name)}
                          disabled={member.role === 'Manager' && !isOwner}
                          className="p-2 bg-slate-950 border border-slate-900 text-rose-500 hover:text-rose-400 hover:bg-slate-900 rounded-xl cursor-pointer transition-colors disabled:opacity-30"
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
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl shadow-xl flex flex-col h-[520px] overflow-hidden">
          <div className="p-6 border-b border-slate-900 bg-slate-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-indigo-400" size={18} />
              <h3 className="text-sm font-bold text-white">Audit Log Activity</h3>
            </div>
            <button
              onClick={() => refetchAudit()}
              disabled={isRefetchingAudit}
              className="p-1 bg-slate-950 border border-slate-900 text-slate-400 rounded-lg hover:text-white cursor-pointer"
            >
              <RefreshCw size={12} className={isRefetchingAudit ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-4 overflow-y-auto divide-y divide-slate-900/40">
            {isLoadingAudit ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Loading activity events...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No system events recorded.
              </div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="pt-3.5 first:pt-0 space-y-1">
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-bold text-white font-mono uppercase text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Performed by <strong className="text-slate-300 font-semibold">{log.user_name}</strong> on entity {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* CREATE USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f1626] border border-slate-900 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-slate-900">
              <h3 className="text-base font-bold text-white font-black tracking-tight">Create Workspace User</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle size={15} />
                  {errorMsg}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="e.g. Charlie Staff"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="name@kitcheniq.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password * (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role Authorization *</label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Staff">Staff (Read-only + stock updates)</option>
                  {isOwner && <option value="Manager">Manager (Full catalog CRUD + purchases)</option>}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 font-semibold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
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
