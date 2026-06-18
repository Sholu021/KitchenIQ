'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  Settings,
  Shield,
  User,
  Landmark,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Coins,
  X
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const userName = useAuthStore((state) => state.userName);
  const role = useAuthStore((state) => state.role);
  const organizationId = useAuthStore((state) => state.organizationId);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // 1. Fetch Organization Details
  const { data: orgDetails, isLoading: isLoadingOrg, refetch: refetchOrg } = useQuery({
    queryKey: ['org-details'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/organization');
      return res.data;
    }
  });

  // 2. Upgrade Subscription Mutation
  const upgradeSubscriptionMutation = useMutation({
    mutationFn: async (tier: string) => {
      const res = await apiClient.post('/auth/organization/subscription', { tier });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-details'] });
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      setPaymentModalOpen(false);
      setIsProcessingPayment(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Upgrade failed. Only Owners can adjust billing.');
      setIsProcessingPayment(false);
    }
  });

  const handleStartUpgrade = (tier: string) => {
    if (role !== 'Owner') {
      alert('Subscription billing management is restricted to the Organization Owner.');
      return;
    }
    setSelectedUpgradeTier(tier);
    setPaymentModalOpen(true);
  };

  const handleSimulatePayment = () => {
    setIsProcessingPayment(true);
    // Simulate Razorpay/Stripe checkout response latency (1.5 seconds)
    setTimeout(() => {
      upgradeSubscriptionMutation.mutate(selectedUpgradeTier);
    }, 1500);
  };

  const handleDowngradeToFree = () => {
    if (role !== 'Owner') {
      alert('Subscription billing management is restricted to the Organization Owner.');
      return;
    }
    if (confirm('Are you sure you want to revert to the Free tier? Limits on products (3), recipes (2), and active batches (5) will be re-enforced.')) {
      upgradeSubscriptionMutation.mutate('Free');
    }
  };

  const rbacRules = [
    { role: 'Owner', desc: 'Full administrative controls, organization registration, user management, and core database CRUD logs.', access: 'Full Access' },
    { role: 'Manager', desc: 'Inventory product catalog edits, category updates, purchase order lifecycle handling, recipe drafting, and sales entries logging.', access: 'Write Access' },
    { role: 'Staff', desc: 'Read-only view of products registry, active batches, and purchase orders. Authorized to submit manual stock movements (STOCK_IN / STOCK_OUT).', access: 'Record Stock' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings size={28} className="text-slate-400" /> Platform Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">Configure tenant profiles, review user role permissions, and check subscription billing status.</p>
        </div>
        {isLoadingOrg && (
          <RefreshCw className="animate-spin text-indigo-400" size={18} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- USER ACCOUNT INFO --- */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-900">
            <User size={18} className="text-indigo-400" /> User Profile & Tenant Details
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</span>
                <span className="text-sm font-semibold text-white block mt-1">{userName || 'Alice Owner'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Role Authorization</span>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 rounded-full">
                  {role || 'Owner'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900/60">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Organization Name</span>
                <span className="text-sm font-semibold text-white block mt-1">
                  {orgDetails?.name || 'KitchenIQ Demo Café'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Organization ID</span>
                <span className="text-sm font-semibold text-indigo-300 font-mono block mt-1"># tenant-{organizationId || 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- BILLING & SUBSCRIPTION DETAILS --- */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-900">
            <CreditCard size={18} className="text-indigo-400" /> Billing & Plans Quota
          </h3>

          {orgDetails ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-950/20 border border-slate-900 rounded-xl">
                <div>
                  <span className="font-semibold text-slate-400 block">Current Tier Plan</span>
                  <span className="text-sm font-black text-white block mt-0.5">{orgDetails.subscription_tier} Tier</span>
                </div>
                {orgDetails.subscription_tier === 'Free' ? (
                  <button
                    onClick={() => handleStartUpgrade('Pro')}
                    disabled={role !== 'Owner'}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Zap size={13} /> Upgrade to Pro
                  </button>
                ) : (
                  <button
                    onClick={handleDowngradeToFree}
                    disabled={role !== 'Owner'}
                    className="py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-900 disabled:opacity-50 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    Revert to Free
                  </button>
                )}
              </div>

              {/* Quotas list */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Usage Limits Matrix</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950/45 border border-slate-900 rounded-xl text-center">
                    <span className="text-slate-400 block font-semibold">Products</span>
                    <span className="text-sm font-bold text-white block mt-1">
                      {orgDetails.products_count} / {orgDetails.products_limit || '∞'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/45 border border-slate-900 rounded-xl text-center">
                    <span className="text-slate-400 block font-semibold">Recipes</span>
                    <span className="text-sm font-bold text-white block mt-1">
                      {orgDetails.recipes_count} / {orgDetails.recipes_limit || '∞'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/45 border border-slate-900 rounded-xl text-center">
                    <span className="text-slate-400 block font-semibold">Active Batches</span>
                    <span className="text-sm font-bold text-white block mt-1">
                      {orgDetails.batches_count} / {orgDetails.batches_limit || '∞'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              Fetching billing quotas details...
            </div>
          )}
        </div>

        {/* --- SYSTEM METRICS --- */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-900">
            <Landmark size={18} className="text-indigo-400" /> System Integration Status
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950/20 border border-slate-900 rounded-xl">
              <span className="font-semibold text-slate-400">Backend API URL</span>
              <span className="font-mono text-indigo-400">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/20 border border-slate-900 rounded-xl">
              <span className="font-semibold text-slate-400">Database Driver</span>
              <span className="font-mono text-slate-200">SQLite Local (SQLAlchemy 2.0)</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/20 border border-slate-900 rounded-xl">
              <span className="font-semibold text-slate-400">AI Engine status</span>
              <span className="px-2 py-0.5 rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-bold text-[10px]">
                {orgDetails?.subscription_tier === 'Free' ? 'LOCKED (AI INSIGHTS DISMISSED)' : 'FALLBACK ENGINE / OPENAI RUNNING'}
              </span>
            </div>
          </div>
        </div>

        {/* --- RBAC DEFINITION --- */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-900">
            <Shield size={18} className="text-indigo-400" /> Role-Based Access Control (RBAC) Matrix
          </h3>

          <div className="space-y-3.5">
            {rbacRules.map((rule) => (
              <div key={rule.role} className="p-3 bg-slate-950/35 border border-slate-900 rounded-xl relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{rule.role}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 border border-slate-800 bg-slate-900 text-slate-400 rounded-full">
                      {rule.access}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* STRIPE / RAZORPAY BILLING MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f1626] border border-slate-900 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <Coins className="text-indigo-400 animate-bounce" size={18} />
                <h3 className="text-base font-bold text-white font-black tracking-tight">Checkout Order Summary</h3>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">KitchenIQ Pro Annual Plan</span>
                  <span className="text-white font-mono">$240.00 / yr</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal font-medium">Unlocks AI natural language Copilot chat, detailed wastage logs analytical audits, and removes all product CRUD database limits.</p>
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Simulated Payment Details</span>
                
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Card Holder Name</span>
                    <span className="font-semibold text-white">{userName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-900/60 pt-2">
                    <span>Simulated Gateway</span>
                    <span className="font-semibold text-indigo-400 flex items-center gap-1"><CheckCircle size={13} className="text-emerald-500" /> Razorpay Test Suite</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 font-semibold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessingPayment}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      Processing Checkout...
                    </>
                  ) : (
                    'Complete Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
