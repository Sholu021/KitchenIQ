'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { ChefHat, Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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
      const res = await apiClient.post('/auth/login', { email, password });
      const { role, organization_id, user_name } = res.data;
      login(role, organization_id, user_name);
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Failed to log in. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = async (role: 'owner' | 'manager' | 'staff') => {
    setEmail(`${role}@kitcheniq.com`);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-50 grid-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logo and Tagline */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl mb-4 text-emerald-500 shadow-sm animate-bounce">
            <ChefHat size={32} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            KitchenIQ <span className="text-emerald-500">AI</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            AI Restaurant Inventory & Intelligence
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500"></div>

          <h2 className="text-xl font-bold text-slate-900 mb-6">Sign In to Your Kitchen</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="chef@kitcheniq.com"
                />
                <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="••••••••••••"
                />
                <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center mb-3.5 font-bold uppercase tracking-widest">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => handleUseDemo('owner')}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Owner
              </button>
              <button
                onClick={() => handleUseDemo('manager')}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Manager
              </button>
              <button
                onClick={() => handleUseDemo('staff')}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Staff
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2.5">
              Demo password is <code className="text-emerald-600 font-bold font-mono">password123</code>
            </p>
          </div>
        </div>

        {/* Register link */}
        <div className="text-center">
          <p className="text-sm text-slate-500 font-medium">
            New to KitchenIQ?{' '}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-500 font-bold transition-colors">
              Register Organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
