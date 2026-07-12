'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { ChefHat, Building, User, Mail, Lock, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/register', {
        organization_name: orgName,
        owner_name: ownerName,
        owner_email: email,
        owner_password: password,
      });
      const { access_token, refresh_token, role, organization_id, user_name } = res.data;
      
      login(access_token, refresh_token, role, organization_id, user_name);
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Failed to register. Please check your inputs or email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 grid-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logo and Tagline */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4 text-emerald-500 shadow-sm">
            <ChefHat size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            KitchenIQ <span className="text-emerald-500">AI</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            AI Restaurant Inventory & Intelligence
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500"></div>

          <h2 className="text-xl font-bold text-slate-900 mb-6">Register Your Organization</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Organization Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="e.g. Roasters Cafe / Pizza World"
                />
                <Building size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="e.g. Chef Jane Doe"
                />
                <User size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Owner Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="owner@mykitchen.com"
                />
                <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Secret Access Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="Choose a strong password"
                />
                <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer text-sm mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Registering Org...
                </>
              ) : (
                'Create Organization & Account'
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <div className="text-center">
          <p className="text-sm text-slate-500 font-medium">
            Already have a kitchen registered?{' '}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-500 font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
