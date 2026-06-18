'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import {
  LayoutDashboard,
  Package,
  Truck,
  ClipboardList,
  BookOpen,
  DollarSign,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  ChefHat,
  Trash2,
  Users,
  BarChart3
} from 'lucide-react';
import { Boxes } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const role = useAuthStore((state) => state.role);
  const userName = useAuthStore((state) => state.userName);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authenticate Check
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Inventory & Batches', href: '/inventory', icon: Boxes },
    { name: 'Suppliers', href: '/suppliers', icon: Truck },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList },
    { name: 'Recipes', href: '/recipes', icon: BookOpen },
    { name: 'Sales', href: '/sales', icon: DollarSign },
    { name: 'Wastage', href: '/wastage', icon: Trash2 },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'AI Insights', href: '/ai-insights', icon: Sparkles },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#080d1a] flex">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-900 bg-[#0c1222] shrink-0">
        
        {/* Brand Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-900">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <ChefHat size={20} />
          </div>
          <span className="text-lg font-black text-white tracking-tight">
            KitchenIQ <span className="text-indigo-400">AI</span>
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-900 bg-[#0a0f1d]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm">
              {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{userName || 'User Name'}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {role || 'Staff'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* --- MOBILE OVERLAY SIDEBAR --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-64 bg-[#0c1222] border-r border-slate-900 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                  <ChefHat size={20} />
                </div>
                <span className="text-lg font-black text-white tracking-tight">KitchenIQ AI</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-900 bg-[#0a0f1d]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm">
                  {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{userName}</p>
                  <p className="text-xs text-slate-400">{role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all cursor-pointer"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-900 bg-[#0c1222]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <Menu size={24} />
          </button>
          
          <div className="hidden md:block text-sm font-mono text-slate-400">
            System Status: <span className="text-emerald-500 font-bold">ONLINE</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-indigo-300">
              KitchenIQ Demo Café
            </div>
          </div>
        </header>

        {/* Children Pages */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
