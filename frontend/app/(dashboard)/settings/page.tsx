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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // 1. Fetch Organization Details
  const { data: orgDetails, isLoading: isLoadingOrg } = useQuery({
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
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings size={28} className="text-emerald-500 shrink-0" /> Platform Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Configure tenant profiles, review user role permissions, and check subscription billing status.</p>
        </div>
        {isLoadingOrg && (
          <RefreshCw className="animate-spin text-emerald-500" size={18} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- USER ACCOUNT INFO --- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <User size={18} className="text-emerald-500 shrink-0" /> User Profile & Tenant Details
          </h3>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Full Name</span>
                <span className="text-sm font-bold text-slate-800 block mt-1">{userName || 'Alice Owner'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Role Authorization</span>
                <span className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 border border-emerald-250 bg-emerald-50 text-emerald-700 rounded-full">
                  {role || 'Owner'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Organization Name</span>
                <span className="text-sm font-bold text-slate-800 block mt-1">
                  {orgDetails?.name || 'KitchenIQ Demo Café'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Organization ID</span>
                <span className="text-sm font-bold text-emerald-600 font-mono block mt-1"># tenant-{organizationId || 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- BILLING & SUBSCRIPTION DETAILS --- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard size={18} className="text-emerald-500 shrink-0" /> Billing & Plans Quota
          </h3>

          {orgDetails ? (
            <div className="space-y-6 text-xs font-semibold text-slate-600">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest">Current Tier Plan</span>
                  <span className="text-base font-extrabold text-slate-900 block mt-0.5">{orgDetails.subscription_tier} Tier</span>
                </div>
                {orgDetails.subscription_tier !== 'Free' && (
                  <button
                    onClick={handleDowngradeToFree}
                    disabled={role !== 'Owner'}
                    className="py-2 px-3 border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100/50 hover:text-rose-700 font-bold rounded-xl text-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Revert to Free
                  </button>
                )}
              </div>

              {orgDetails.subscription_tier === 'Free' && (
                <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-4 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="font-bold text-slate-800 text-xs">Select Pricing Plan:</span>
                    {/* Billing Cycle Toggle */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 border border-slate-200/60 rounded-xl self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`py-1 px-3 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                          billingCycle === 'monthly'
                            ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`py-1 px-3 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer ${
                          billingCycle === 'annual'
                            ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Annual
                        <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-1 rounded">
                          Save 17%
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">KitchenIQ Pro</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">
                        {billingCycle === 'monthly'
                          ? '$24.00 / month, cancel anytime'
                          : '$20.00 / month ($240.00 billed annually)'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleStartUpgrade('Pro')}
                      disabled={role !== 'Owner'}
                      className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                    >
                      <Zap size={12} /> {billingCycle === 'monthly' ? 'Subscribe @ $24/mo' : 'Subscribe @ $240/yr'}
                    </button>
                  </div>
                </div>
              )}

              {/* Quotas list */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Usage Limits Matrix</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Products</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">
                      {orgDetails.products_count} / {orgDetails.products_limit || '∞'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Recipes</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">
                      {orgDetails.recipes_count} / {orgDetails.recipes_limit || '∞'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Active Batches</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-1 font-mono">
                      {orgDetails.batches_count} / {orgDetails.batches_limit || '∞'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 font-medium text-xs">
              Fetching billing quotas details...
            </div>
          )}
        </div>

        {/* --- SYSTEM METRICS --- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Landmark size={18} className="text-emerald-500 shrink-0" /> System Integration Status
          </h3>

          <div className="space-y-3.5 text-xs font-semibold text-slate-600">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="font-bold text-slate-400">Backend API URL</span>
              <span className="font-mono text-emerald-600 truncate max-w-xs">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="font-bold text-slate-400">Database Driver</span>
              <span className="font-mono text-slate-700">SQLite Local (SQLAlchemy 2.0)</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="font-bold text-slate-400">AI Engine Status</span>
              <span className="px-2.5 py-0.5 rounded-full border bg-emerald-50 border-emerald-100 text-emerald-700 font-bold text-[10px]">
                {orgDetails?.subscription_tier === 'Free' ? 'LOCKED (AI INSIGHTS DISMISSED)' : 'ACTIVE (FALLBACK ENGINE)'}
              </span>
            </div>
          </div>
        </div>

        {/* --- RBAC DEFINITION --- */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield size={18} className="text-emerald-500 shrink-0" /> Role-Based Access Control (RBAC) Matrix
          </h3>

          <div className="space-y-4">
            {rbacRules.map((rule) => (
              <div key={rule.role} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{rule.role}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 border border-slate-200 bg-white text-slate-500 rounded-full">
                      {rule.access}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* STRIPE / RAZORPAY BILLING MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-[20px] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins className="text-emerald-500" size={18} />
                <h3 className="text-lg font-bold text-slate-900">Checkout Order Summary</h3>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">
                    KitchenIQ Pro {billingCycle === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                  </span>
                  <span className="text-slate-800 font-bold font-mono">
                    {billingCycle === 'annual' ? '$240.00 / yr' : '$24.00 / mo'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                  Unlocks AI natural language Copilot chat, detailed wastage logs analytical audits, and removes all product CRUD database limits. Billed {billingCycle === 'annual' ? 'annually' : 'monthly'}.
                </p>
              </div>

              <div className="space-y-3 font-semibold text-slate-600">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Simulated Payment Details</span>
                
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Card Holder Name</span>
                    <span className="font-bold text-slate-800">{userName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 border-t border-slate-200/80 pt-2.5">
                    <span>Simulated Gateway</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={13} className="text-emerald-500" /> Razorpay Test Suite</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessingPayment}
                  className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-emerald-500/10"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="animate-spin text-white" size={13} />
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
