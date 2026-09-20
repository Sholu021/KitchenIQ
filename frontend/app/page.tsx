'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Clock,
  ChefHat,
  MessageCircle,
  Calculator,
  ChevronRight,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Layers,
  Boxes,
  Menu,
  X,
  Zap,
  Check,
  Lock,
  RefreshCw,
  Building2,
  Utensils,
  Bot,
  SlidersHorizontal,
  DollarSign
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const login = useAuthStore((state) => state.login);
  
  const [demoLoading, setDemoLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Showcase Active Tab
  const [activeTab, setActiveTab] = useState<'inventory' | 'copilot' | 'fefo' | 'recipes'>('inventory');

  // ROI Calculator State
  const [monthlySpend, setMonthlySpend] = useState(25000);
  const [wastePercent, setWastePercent] = useState(18);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [yearlySavings, setYearlySavings] = useState(0);

  // Pricing Toggle State (false = Monthly, true = Annual with 20% discount)
  const [annualBilling, setAnnualBilling] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSeeDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await apiClient.post('/auth/login', {
        email: 'owner@kitcheniq.com',
        password: 'password123'
      });
      const { access_token, refresh_token, role, organization_id, user_name } = res.data;
      login(access_token, refresh_token, role, organization_id, user_name);
      router.push('/dashboard');
    } catch (err) {
      alert('Failed to log in to demo mode. Please verify the backend is online.');
    } finally {
      setDemoLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isHydrated, router]);

  // Calculate Savings
  useEffect(() => {
    // Standard industry metric: AI inventory reduces waste by an average of 42%
    const currentWaste = monthlySpend * (wastePercent / 100);
    const savings = currentWaste * 0.42;
    setMonthlySavings(savings);
    setYearlySavings(savings * 12);
  }, [monthlySpend, wastePercent]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const applyPreset = (spend: number, waste: number) => {
    setMonthlySpend(spend);
    setWastePercent(waste);
  };

  const faqs = [
    {
      q: "How does KitchenIQ AI separate data for multiple restaurant outlets?",
      a: "Our architecture is fully multi-tenant. Each restaurant organization owns a separate tenant space scoped by unique organization IDs in the database. Users from Pizza World can never access or query products, recipes, or transactions from Coffee House under any circumstances."
    },
    {
      q: "What is FEFO, and how does it prevent ingredient waste?",
      a: "FEFO stands for First-Expiring-First-Out. Unlike standard FIFO (which assumes the oldest purchased item is used first), our system prioritizes inventory batches based on actual expiration dates. When sales occur, ingredients are automatically decremented from the closest expiring batch, ensuring items with short shelf lives are used up first."
    },
    {
      q: "Can my kitchen staff record stock levels without access to financials?",
      a: "Yes! KitchenIQ AI features Role-Based Access Control (RBAC). Staff accounts are authorized only to inspect current inventory levels and submit manual stock movements (STOCK_IN / STOCK_OUT). They cannot edit product unit costs, delete recipes, view overall revenue charts, or draft purchase orders."
    },
    {
      q: "How does the AI Natural Language Copilot work?",
      a: "The Copilot serializes your kitchen's current inventory levels, recipe ingredient costs, expiring batches, and monthly sales histories. It uses this context to answer queries like 'What should I reorder?' or 'Which items are expiring soon?' in plain English, generating clear, custom suggestions."
    },
    {
      q: "What if I don't have an OpenAI API Key?",
      a: "KitchenIQ AI is fully equipped with an intelligent, data-driven analytical fallback engine. If no OpenAI key is configured, the platform reads your actual database metrics to compile custom health summaries, reorder alerts, and contextual copilot answers. It remains fully functional during testing!"
    }
  ];

  return (
    <div className="min-h-screen grid-bg-dark text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* --- HEADER NAVBAR --- */}
      <header className="h-20 max-w-7xl w-full mx-auto px-6 flex items-center justify-between z-50 sticky top-0 bg-[#060913]/90 backdrop-blur-xl border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-amber-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <ChefHat size={22} className="text-amber-400" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">
            KitchenIQ <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">AI</span>
          </span>
        </div>
        
        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300">
          <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
          <a href="#showcase" className="hover:text-amber-400 transition-colors">Live Showcase</a>
          <a href="#roi" className="hover:text-amber-400 transition-colors">ROI Calculator</a>
          <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-amber-400 transition-colors">FAQ</a>
        </nav>
        
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2.5 text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <button
            onClick={handleSeeDemo}
            disabled={demoLoading}
            className="text-xs font-bold px-4 py-2.5 border border-slate-700/80 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Zap size={13} className="text-amber-400" />
            {demoLoading ? 'Launching Demo...' : 'See Demo'}
          </button>
          <Link
            href="/register"
            className="text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 bg-slate-900/50"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-20 left-0 right-0 z-40 bg-[#080d1a] border-b border-slate-800 p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <a 
            href="#features" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-300 py-2 border-b border-slate-800/50"
          >
            Features
          </a>
          <a 
            href="#showcase" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-300 py-2 border-b border-slate-800/50"
          >
            Live Showcase
          </a>
          <a 
            href="#roi" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-300 py-2 border-b border-slate-800/50"
          >
            ROI Calculator
          </a>
          <a 
            href="#pricing" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-300 py-2 border-b border-slate-800/50"
          >
            Pricing
          </a>
          <a 
            href="#faq" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-slate-300 py-2 border-b border-slate-800/50"
          >
            FAQ
          </a>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSeeDemo();
              }}
              disabled={demoLoading}
              className="w-full text-xs font-bold py-3 border border-slate-700 bg-slate-900 text-slate-200 rounded-xl flex items-center justify-center gap-2"
            >
              <Zap size={14} className="text-amber-400" />
              {demoLoading ? 'Launching Demo...' : 'Instant Demo Login'}
            </button>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-xs font-bold py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 rounded-xl text-center"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 lg:pt-20 pb-16 px-6 max-w-6xl mx-auto z-10 text-center space-y-8">
        
        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 rounded-full text-xs font-medium backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Next-Gen Smart Kitchen ERP &amp; Waste Optimization</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] max-w-5xl mx-auto">
          Stop Kitchen Food Waste &amp; <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            Recipe Margin Leakage
          </span> <br />
          With AI Precision
        </h1>

        {/* Sub-headline */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
          KitchenIQ AI predicts ingredient stockouts, automates FEFO batch tracking, and recalculates recipe margins in real time. Identify avoidable food waste and protect recipe margins with better inventory visibility.
        </p>

        {/* Target Audience Pills */}
        <div className="flex flex-wrap justify-center items-center gap-2 pt-2 text-[11px] font-semibold text-slate-400">
          <span className="px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full flex items-center gap-1.5">
            <Utensils size={12} className="text-amber-400" /> Fine Dining &amp; Bistros
          </span>
          <span className="px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full flex items-center gap-1.5">
            <Building2 size={12} className="text-indigo-400" /> Cloud Kitchens
          </span>
          <span className="px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full flex items-center gap-1.5">
            <Zap size={12} className="text-emerald-400" /> Bakeries &amp; Cafés
          </span>
          <span className="px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full flex items-center gap-1.5">
            <Layers size={12} className="text-sky-400" /> Multi-Outlet Chains
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-2xl mx-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto py-3.5 px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] cursor-pointer"
          >
            Start Free Trial <ArrowRight size={16} />
          </Link>
          <button
            onClick={handleSeeDemo}
            disabled={demoLoading}
            className="w-full sm:w-auto py-3.5 px-8 border border-slate-700/80 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap size={16} className="text-amber-400" />
            {demoLoading ? 'Launching Demo...' : 'Instant Demo Login'}
          </button>
          <a
            href="https://wa.me/917549569748"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto py-3.5 px-6 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle size={17} /> WhatsApp Us
          </a>
        </div>

        {/* Key Trust Highlights */}
        <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-900/60 text-slate-400 text-xs">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span>Multi-Tenant Security</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span>FEFO Batch Tracking</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span>Instant Demo Access</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span>OpenAI + Local Fallback</span>
          </div>
        </div>
      </section>

      {/* --- INTERACTIVE PRODUCT SHOWCASE SECTION --- */}
      <section id="showcase" className="px-6 max-w-6xl mx-auto w-full z-10 pb-20 pt-6">
        
        {/* Section Heading */}
        <div className="text-center mb-8 space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">Interactive Dashboard View</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Experience KitchenIQ in Action</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">Explore how KitchenIQ AI streamlines your daily kitchen inventory workflow.</p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes size={14} /> Smart Stock Alerts
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot size={14} /> AI Reorder Copilot
          </button>
          <button
            onClick={() => setActiveTab('fefo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'fefo'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock size={14} /> FEFO Expiry Engine
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'recipes'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={14} /> Recipe Margins
          </button>
        </div>

        {/* Dashboard Mockup Frame */}
        <div className="dark-glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative bg-[#080d1a]">
          {/* Top Window Bar */}
          <div className="h-9 flex items-center justify-between px-4 bg-[#050811] border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="text-[11px] text-slate-400 font-mono ml-3">kitcheniq-app.com/dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">● Illustrative Workspace Preview</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[460px]">
            {/* Sidebar */}
            <div className="hidden lg:flex flex-col gap-4 p-4 border-r border-slate-800/60 bg-[#060a15]">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/60">
                <ChefHat size={18} className="text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">Demo Restaurant</div>
                  <div className="text-[10px] text-slate-500 font-mono">Illustrative Workspace</div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer ${activeTab === 'inventory' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`} onClick={() => setActiveTab('inventory')}>
                  <Boxes size={14} /> Inventory &amp; Stock
                </div>
                <div className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer ${activeTab === 'copilot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`} onClick={() => setActiveTab('copilot')}>
                  <Sparkles size={14} /> AI Copilot
                </div>
                <div className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer ${activeTab === 'fefo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`} onClick={() => setActiveTab('fefo')}>
                  <Clock size={14} /> Expiring Batches
                </div>
                <div className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer ${activeTab === 'recipes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`} onClick={() => setActiveTab('recipes')}>
                  <BarChart3 size={14} /> Recipe Costing
                </div>
              </div>

              <div className="mt-auto p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <div className="font-bold text-slate-200 mb-1">Role: Kitchen Manager</div>
                <div>RBAC Permission: Standard</div>
              </div>
            </div>

            {/* Tab Main Content */}
            <div className="lg:col-span-3 p-6 space-y-6 flex flex-col justify-between bg-[#080d1a]">
              
              {/* TAB 1: SMART INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Boxes size={18} className="text-amber-400" /> Real-Time Stock &amp; Low-Inventory Warnings
                      </h3>
                      <p className="text-xs text-slate-400">Live quantity tracking with automatic reorder thresholds.</p>
                    </div>
                    <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-2.5 py-1 rounded-lg">
                      3 Items Low
                    </span>
                  </div>

                  {/* Stock Items Table Mock */}
                  <div className="space-y-2 font-mono text-xs">
                    <div className="p-3 bg-[#0d1527] border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <div>
                          <div className="font-sans font-bold text-white">Mozzarella Cheese (Whole Milk)</div>
                          <div className="text-[10px] text-slate-500 font-mono">Category: Dairy • Min: 15.0 kg</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-rose-400 font-bold">4.5 kg left</div>
                        <div className="text-[10px] text-rose-500/80 font-sans">Critical Low</div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#0d1527] border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <div>
                          <div className="font-sans font-bold text-white">San Marzano Tomato Sauce</div>
                          <div className="text-[10px] text-slate-500 font-mono">Category: Pantry • Min: 20.0 L</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-bold">18.0 L left</div>
                        <div className="text-[10px] text-amber-500/80 font-sans font-semibold">Reorder Soon</div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#0d1527] border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <div>
                          <div className="font-sans font-bold text-white">Extra Virgin Olive Oil (5L Tins)</div>
                          <div className="text-[10px] text-slate-500 font-mono">Category: Oils • Min: 4.0 Tins</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold">12.0 Tins left</div>
                        <div className="text-[10px] text-emerald-500/80 font-sans">Optimal Stock</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AI COPILOT */}
              {activeTab === 'copilot' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-indigo-400 animate-pulse" /> AI Natural Language Kitchen Copilot
                      </h3>
                      <p className="text-xs text-slate-400">Ask your kitchen data anything in plain English.</p>
                    </div>
                    <span className="text-[11px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold px-2.5 py-1 rounded-lg">
                      Engine: OpenAI / Fallback Active
                    </span>
                  </div>

                  {/* Chat Box Simulation */}
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl max-w-md ml-auto text-slate-200">
                      <strong>Chef:</strong> "What ingredients are running low and what purchase orders should I generate today?"
                    </div>

                    <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-indigo-100 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold">
                        <Sparkles size={14} /> KitchenIQ AI Recommendation Summary:
                      </div>
                      <p className="text-slate-300 leading-relaxed text-xs">
                        Based on current weekend sales velocity and stock levels, you will run out of <strong>Mozzarella Cheese</strong> in 1.5 days. I recommend placing a purchase order for <strong>25 kg</strong> from Dairy Corp today.
                      </p>
                      <div className="pt-2 flex gap-2">
                        <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] cursor-pointer">
                          Auto-Draft Purchase Order
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FEFO EXPIRY */}
              {activeTab === 'fefo' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Clock size={18} className="text-rose-400" /> FEFO Expiry Batch Allocation
                      </h3>
                      <p className="text-xs text-slate-400">First-Expiring-First-Out logic ensures items with short shelf life sell first.</p>
                    </div>
                    <span className="text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold px-2.5 py-1 rounded-lg">
                      2 Batches Expiring Soon
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          Fresh Basil Leaves <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono">Batch #B-104</span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">Purchased: Sept 16 • Qty: 3.0 kg</div>
                      </div>
                      <div className="text-right">
                        <div className="text-rose-400 font-bold">Expires in 2 days</div>
                        <div className="text-[10px] text-slate-500">Priority 1 for usage</div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          Heavy Cream 35% <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">Batch #B-098</span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">Purchased: Sept 14 • Qty: 8.0 L</div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-bold">Expires in 4 days</div>
                        <div className="text-[10px] text-slate-500">Priority 2 for usage</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RECIPE COSTING */}
              {activeTab === 'recipes' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <BarChart3 size={18} className="text-emerald-400" /> Dynamic Recipe Margin Analytics
                      </h3>
                      <p className="text-xs text-slate-400">Live profit margin calculations recalculated automatically as supplier prices change.</p>
                    </div>
                    <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2.5 py-1 rounded-lg">
                      Avg Profit Margin: 72.4%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 bg-[#0d1527] border border-slate-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-white text-sm">Margherita Pizza 12"</div>
                          <div className="text-slate-400 text-[10px]">Menu Price: $16.50</div>
                        </div>
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">76.2% Margin</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                        <span className="text-slate-400">Raw Cost: $3.92</span>
                        <span className="text-emerald-400 font-bold">Profit: $12.58</span>
                      </div>
                    </div>

                    <div className="p-4 bg-[#0d1527] border border-slate-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-white text-sm">Truffle Cream Pasta</div>
                          <div className="text-slate-400 text-[10px]">Menu Price: $22.00</div>
                        </div>
                        <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[10px]">64.5% Margin</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                        <span className="text-slate-400">Raw Cost: $7.81</span>
                        <span className="text-amber-400 font-bold">Profit: $14.19</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Quick Bar */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  <span>Click <strong>Instant Demo Login</strong> above to open this live dashboard in real mode.</span>
                </div>
                <button
                  onClick={handleSeeDemo}
                  disabled={demoLoading}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg cursor-pointer"
                >
                  Launch Demo
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* --- BENTO GRID FEATURES SHOWCASE --- */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto w-full z-10 border-t border-slate-800/60">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">Engineered For High-Margin Kitchens</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Everything You Need To Control Food Cost
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Built ground-up for modern food operations. Stop relying on manual spreadsheets and outdated legacy POS add-ons.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Card 1: Multi-Tenant & Security */}
          <div className="dark-glass-panel dark-glass-panel-hover p-7 rounded-2xl md:col-span-2 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 w-fit">
                <Lock size={22} />
              </div>
              <h3 className="text-xl font-extrabold text-white">Multi-Tenant Data Isolation &amp; RBAC</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Enterprise multi-tenant database design ensuring absolute organization scoping. Kitchen staff log daily counts without seeing financial reports or recipe margins, protecting your trade secrets.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono rounded-lg">Strict Tenant Boundaries</span>
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono rounded-lg">Staff / Manager / Admin Roles</span>
            </div>
          </div>

          {/* Bento Card 2: FEFO Expiry Engine */}
          <div className="dark-glass-panel dark-glass-panel-hover p-7 rounded-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 w-fit">
                <Clock size={22} />
              </div>
              <h3 className="text-xl font-extrabold text-white">FEFO Expiry Warnings</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                First-Expiring-First-Out batch tracking alerts kitchen prep teams to use short shelf-life items first, eliminating costly spoilage.
              </p>
            </div>
            <span className="text-rose-400 text-xs font-bold flex items-center gap-1">
              Eliminate Spoilage Waste <ArrowRight size={14} />
            </span>
          </div>

          {/* Bento Card 3: Dynamic Recipe Costing */}
          <div className="dark-glass-panel dark-glass-panel-hover p-7 rounded-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 w-fit">
                <BarChart3 size={22} />
              </div>
              <h3 className="text-xl font-extrabold text-white">Live Recipe Costing</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Link raw ingredients directly to dish recipes. When supplier prices increase, your dish food cost and margin percentages update instantly.
              </p>
            </div>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              Protect Gross Profit <ArrowRight size={14} />
            </span>
          </div>

          {/* Bento Card 4: AI Copilot */}
          <div className="dark-glass-panel dark-glass-panel-hover p-7 rounded-2xl md:col-span-2 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 w-fit">
                <Sparkles size={22} />
              </div>
              <h3 className="text-xl font-extrabold text-white">AI Natural Language Copilot &amp; Smart Fallback</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Ask queries like "What should I order for the weekend?" in plain English. Powered by OpenAI with an intelligent local fallback engine that reads your live database metrics even without an API key.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono rounded-lg">Natural Language Querying</span>
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono rounded-lg">Deterministic Fallback</span>
            </div>
          </div>

        </div>
      </section>

      {/* --- INTERACTIVE ROI CALCULATOR SECTION --- */}
      <section id="roi" className="py-20 px-6 max-w-5xl mx-auto w-full z-10 border-t border-slate-800/60">
        <div className="dark-glass-panel rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden bg-[#080d1a]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-500"></div>

          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <Calculator size={20} />
            <span className="text-xs font-extrabold uppercase tracking-widest font-mono">Waste Savings Optimizer</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">Calculate Your Kitchen Savings</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-xl">
            Select a quick profile preset or adjust the sliders to estimate how much food waste money KitchenIQ AI recovers for your kitchen.
          </p>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="text-xs text-slate-400 font-semibold mr-2">Quick Presets:</span>
            <button
              onClick={() => applyPreset(10000, 15)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Small Café ($10k)
            </button>
            <button
              onClick={() => applyPreset(25000, 18)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Medium Bistro ($25k)
            </button>
            <button
              onClick={() => applyPreset(60000, 22)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Cloud Kitchen ($60k)
            </button>
            <button
              onClick={() => applyPreset(120000, 25)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Multi-Outlet ($120k)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Input Sliders */}
            <div className="space-y-8">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-slate-300 flex items-center gap-2">
                    <DollarSign size={16} className="text-amber-400" /> Monthly Raw Food Spend
                  </span>
                  <span className="text-white font-mono text-base font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    ${monthlySpend.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="3000"
                  max="200000"
                  step="1000"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(parseInt(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-950 h-2.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$3,000</span>
                  <span>$100,000</span>
                  <span>$200,000+</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-slate-300 flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-indigo-400" /> Estimated Food Waste Rate
                  </span>
                  <span className="text-white font-mono text-base font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    {wastePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={wastePercent}
                  onChange={(e) => setWastePercent(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-950 h-2.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5% (Strict Control)</span>
                  <span>18% (Industry Avg)</span>
                  <span>35% (High Leakage)</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Illustrative Estimate Note:</strong> Savings calculations use an estimated 42% waste reduction factor for simulation purposes. Actual kitchen results vary based on operational volume, waste tracking discipline, and menu items.
              </div>

            </div>

            {/* Calculations display */}
            <div className="flex flex-col justify-between bg-gradient-to-br from-[#0c1325] to-[#070b16] p-8 border border-slate-800 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl -z-10"></div>
              
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Estimated Monthly Savings</span>
                  <span className="text-3xl sm:text-4xl font-black text-white mt-1 block font-mono">
                    ${monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Projected Annual Savings</span>
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 mt-1 block font-mono">
                    ${yearlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  Lock In ${Math.round(yearlySavings).toLocaleString()}/Year Savings <ArrowRight size={15} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="py-20 px-6 max-w-6xl mx-auto w-full z-10 border-t border-slate-800/60">
        <div className="text-center mb-12 space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Simple Transparent Pricing</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">Flexible Plans For Every Scale</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Choose the right tier for your food operations. Lock in high-margin inventory tools and eliminate waste.
          </p>

          {/* Billing Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${!annualBilling ? 'text-white' : 'text-slate-400'}`}>Monthly Billing</span>
            <button
              onClick={() => setAnnualBilling(!annualBilling)}
              className="w-12 h-6 bg-slate-800 rounded-full p-1 transition-colors relative cursor-pointer"
              aria-label="Toggle annual billing"
            >
              <div className={`w-4 h-4 rounded-full bg-amber-400 transition-transform ${annualBilling ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${annualBilling ? 'text-white' : 'text-slate-400'}`}>
              Annual Billing <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-extrabold">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Plan 1: Bistro */}
          <div className="dark-glass-panel rounded-2xl p-8 border border-slate-800 flex flex-col justify-between space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white">Bistro</h3>
              <p className="text-xs text-slate-400 mt-1">Best for small cafes, standalone bakeries, and cloud kitchens.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white font-mono">
                  ${annualBilling ? '39' : '49'}
                </span>
                <span className="text-xs text-slate-400"> / month</span>
                {annualBilling && <div className="text-[10px] text-emerald-400 font-mono mt-1">Billed annually ($468/yr)</div>}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Up to 100 products catalog</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Dynamic recipe margin calculator</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Manual inventory logs &amp; batch creation</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Basic reorder threshold alerts</span>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl text-center text-xs transition-colors cursor-pointer"
            >
              Start Bistro Trial
            </Link>
          </div>

          {/* Plan 2: Trattoria (Featured) */}
          <div className="dark-glass-panel rounded-2xl p-8 border-2 border-indigo-500/60 flex flex-col justify-between space-y-8 relative bg-slate-950/40 shadow-2xl">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full shadow-lg border border-indigo-300/30">
              Most Popular
            </span>

            <div>
              <h3 className="text-xl font-bold text-white mt-1">Trattoria</h3>
              <p className="text-xs text-slate-400 mt-1">Ideal for high-volume restaurants, bistros, and growing food brands.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white font-mono">
                  ${annualBilling ? '79' : '99'}
                </span>
                <span className="text-xs text-slate-400"> / month</span>
                {annualBilling && <div className="text-[10px] text-emerald-400 font-mono mt-1">Billed annually ($948/yr)</div>}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-200 font-medium">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Unlimited products &amp; suppliers</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-200 font-medium">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>FEFO Expiry batch warnings</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-200 font-medium">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Automated PO Lifecycle &amp; Receiving</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-200 font-medium">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>AI Predictive Copilot &amp; Smart Fallback</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-200 font-medium">
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>Role-Based Staff Permissions (RBAC)</span>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl text-center text-xs transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              Start Trattoria Trial
            </Link>
          </div>

          {/* Plan 3: Grand Cuisine */}
          <div className="dark-glass-panel rounded-2xl p-8 border border-slate-800 flex flex-col justify-between space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white">Grand Cuisine</h3>
              <p className="text-xs text-slate-400 mt-1">Enterprise multi-outlet control for chains and cloud kitchen networks.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white font-mono">Custom</span>
                <span className="text-xs text-slate-400"> / annual billing</span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Multi-outlet synchronization &amp; transfers</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>Custom POS integration endpoints</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>Dedicated Support Account Director</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check size={16} className="text-emerald-400 shrink-0" />
                  <span>SLA &amp; Custom Onboarding Training</span>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl text-center text-xs transition-colors cursor-pointer"
            >
              Contact Enterprise Sales
            </Link>
          </div>

        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto w-full z-10 border-t border-slate-800/60">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">Clear Operational Answers</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Everything you need to know about tenant data isolation, FEFO expiry rules, and AI copilot accuracy.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="dark-glass-panel border border-slate-800 rounded-2xl overflow-hidden transition-all bg-[#090e1c]"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 flex items-center justify-between text-left font-bold text-white text-sm sm:text-base cursor-pointer select-none gap-4"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-amber-400 font-mono text-xs font-extrabold">0{index + 1}.</span>
                    {faq.q}
                  </span>
                  <span className={`w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-lg transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-45 bg-indigo-600 text-white' : ''}`}>
                    +
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-4 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- PRE-FOOTER FINAL CTA BANNER --- */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full z-10">
        <div className="dark-glass-panel rounded-3xl p-8 sm:p-14 border border-indigo-500/30 text-center relative overflow-hidden bg-gradient-to-r from-[#0c1329] via-[#091024] to-[#0d1630]">
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl"></div>

          <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider">
              Start Cutting Waste Today
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ready To Control Your Kitchen Margins?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Join forward-thinking restaurants, cafés, and cloud kitchens using KitchenIQ AI to eliminate food waste and protect bottom-line profits.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="w-full sm:w-auto py-3.5 px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] cursor-pointer"
              >
                Start Free 14-Day Trial <ArrowRight size={16} />
              </Link>
              <button
                onClick={handleSeeDemo}
                disabled={demoLoading}
                className="w-full sm:w-auto py-3.5 px-8 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap size={16} className="text-amber-400" />
                {demoLoading ? 'Launching Demo...' : 'Instant Demo Login'}
              </button>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 font-medium">
              No credit card required • Instant 2-minute setup • Full access to demo mode
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800/80 bg-[#04070f] py-12 px-6 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <ChefHat size={20} className="text-amber-400" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight">
                KitchenIQ <span className="text-amber-400">AI</span>
              </span>
              <div className="text-[10px] text-slate-500">Smart Kitchen ERP &amp; Analytics</div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400 font-semibold">
            <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
            <a href="#showcase" className="hover:text-amber-400 transition-colors">Live Showcase</a>
            <a href="#roi" className="hover:text-amber-400 transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-amber-400 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> All Systems Normal
            </span>
            <span>&copy; {new Date().getFullYear()} KitchenIQ AI.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
