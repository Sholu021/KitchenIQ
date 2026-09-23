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
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50/70 to-blue-50/60 px-6 py-16 lg:py-20">
        <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 top-20 h-[320px] w-[320px] rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[55fr_45fr] lg:gap-14">

          {/* Hero Content */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              AI-Powered Inventory Intelligence
            </div>

            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              Know What Your Kitchen Needs &mdash;{" "}
              <span className="text-orange-500">Before You Run Out.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              KitchenIQ AI analyzes your inventory and sales patterns to help your kitchen predict demand, prevent stockouts, reduce food waste, and reorder smarter.
            </p>

            <div className="mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-3.5">
              <span className="text-xl font-bold text-orange-500">i</span>
              <p className="text-sm leading-6 text-amber-900">
                Book a free audit and we'll walk through <strong>your own inventory data</strong> with you &mdash; no generic averages, just your kitchen's numbers.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#showcase"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                See KitchenIQ in action <ArrowRight size={15} />
              </a>

              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Start Free Trial
              </Link>

              <button
                onClick={handleSeeDemo}
                disabled={demoLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              >
                <Zap size={15} />
                {demoLoading ? 'Launching Demo...' : 'Instant Demo'}
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              No credit card required for the demo
            </p>

            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                'AI-driven demand forecasting',
                'Low-stock alerts before you run out',
                'Smarter, data-backed reordering',
                'One dashboard for your whole kitchen',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-600">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-xs font-semibold text-slate-500">
              <span>Built for commercial kitchens</span>
              <span>AI-powered insights</span>
              <span>Real-time inventory</span>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative">
            <div className="absolute -right-3 -top-6 z-20 hidden max-w-[250px] rounded-xl border border-red-100 bg-white p-3 shadow-xl sm:flex sm:items-center sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-lg">
                !
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Low Stock Alert</div>
                <div className="text-[11px] font-semibold leading-4 text-red-500">
                  Chicken Breast: 3 kg left &mdash; Order now
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  KitchenIQ &mdash; Live Dashboard (example)
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-300">Inventory Health</div>
                    <div className="mt-1 text-2xl font-extrabold">82%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Low Stock</div>
                    <div className="mt-1 text-sm font-bold text-blue-300">7 items</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-semibold text-slate-400">Waste This Month</div>
                    <div className="mt-1 text-base font-extrabold text-slate-900">₹18,420</div>
                    <div className="mt-1 text-[10px] text-slate-400">example figure</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[10px] font-semibold text-slate-400">AI Forecast</div>
                    <div className="mt-1 text-base font-extrabold text-slate-900">7 days</div>
                    <div className="mt-1 text-[10px] font-semibold text-emerald-600">ahead</div>
                  </div>
                  <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:col-span-1">
                    <div className="text-[10px] font-semibold text-slate-400">Ingredient</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">Tomatoes</div>
                    <div className="mt-1 text-[10px] text-slate-400">12 kg on hand</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-white p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                    <span className="flex-1 text-[11px] font-medium leading-4 text-slate-600">
                      Tomatoes: predicted usage 28 kg &mdash; reorder 20 kg within 2 days
                    </span>
                    <span className="hidden rounded-full bg-red-50 px-2 py-1 text-[9px] font-bold text-red-600 sm:inline">
                      AI Forecast
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-orange-100 bg-white p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                    <span className="flex-1 text-[11px] font-medium leading-4 text-slate-600">
                      Mozzarella expiring in 2 days &mdash; use priority
                    </span>
                    <span className="hidden rounded-full bg-orange-50 px-2 py-1 text-[9px] font-bold text-orange-600 sm:inline">
                      Expiry
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="flex-1 text-[11px] font-medium leading-4 text-slate-600">
                      Olive Oil reorder recommendation sent
                    </span>
                    <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600 sm:inline">
                      Done
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 z-20 hidden max-w-[270px] rounded-xl border border-blue-100 bg-white p-3 shadow-xl sm:flex sm:items-center sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">
                !
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">AI Insight</div>
                <div className="text-[11px] font-semibold leading-4 text-blue-600">
                  Chicken likely to hit reorder point in 3 days
                </div>
              </div>
            </div>
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

      {/* --- WHY KITCHENIQ / BUSINESS VALUE --- */}
      <section id="why-kitcheniq" className="bg-slate-50 py-20 px-6 border-t border-slate-200">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
              Why KitchenIQ
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Every Smarter Order Protects Your Margin
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
              We won&apos;t invent an average savings number for your kitchen.
              Every kitchen&apos;s inventory, purchasing, and sales patterns are different.
              Here&apos;s what KitchenIQ is built to move, directionally.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl font-extrabold text-emerald-600">
                ↓
              </div>
              <h3 className="text-base font-bold text-slate-900">Food Waste</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Reduce avoidable over-ordering and ingredients that expire unused.
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl font-extrabold text-emerald-600">
                ↓
              </div>
              <h3 className="text-base font-bold text-slate-900">Stockout Risk</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Identify shortages earlier, before they hit mid-service.
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xl font-extrabold text-blue-600">
                ↑
              </div>
              <h3 className="text-base font-bold text-slate-900">Inventory Visibility</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Know what&apos;s actually on your shelves, in real time.
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xl font-extrabold text-blue-600">
                ↑
              </div>
              <h3 className="text-base font-bold text-slate-900">Purchasing Efficiency</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Make reorder decisions based on data, not gut feel.
              </p>
            </div>
          </div>

          <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-6 text-slate-500 sm:text-sm">
            Your actual results will depend on your kitchen&apos;s inventory,
            purchasing, and sales patterns. A free audit can estimate what this
            might look like for your specific kitchen.
          </p>
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
              Medium Bistro (₹25k)
            </button>
            <button
              onClick={() => applyPreset(60000, 22)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Cloud Kitchen (₹60k)
            </button>
            <button
              onClick={() => applyPreset(120000, 25)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Multi-Outlet (₹120k)
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
                    ₹{monthlySpend.toLocaleString()}
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
                  <span>₹3,000</span>
                  <span>₹100,000</span>
                  <span>₹200,000+</span>
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
                  <span>18% (Illustrative)</span>
                  <span>35% (High Leakage)</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Illustrative Estimate Note:</strong> Savings calculations use an estimated 42% reduction factor for illustration. Actual kitchen results vary based on operational volume, waste tracking discipline, and menu items.
              </div>

            </div>

            {/* Calculations display */}
            <div className="flex flex-col justify-between bg-gradient-to-br from-[#0c1325] to-[#070b16] p-8 border border-slate-800 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl -z-10"></div>
              
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Estimated Monthly Savings</span>
                  <span className="text-3xl sm:text-4xl font-black text-white mt-1 block font-mono">
                    ₹{monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Projected Annual Savings</span>
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 mt-1 block font-mono">
                    ₹{yearlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  Explore ₹{Math.round(yearlySavings).toLocaleString()} Potential Annual Savings <ArrowRight size={15} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="py-20 px-6 max-w-6xl mx-auto w-full z-10 border-t border-slate-200">
        <div className="text-center mb-12 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">Simple, transparent pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Plans Built for Your Kitchen</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Start with the essentials, then scale as your kitchen grows.
          </p>
        </div>

        <div className="flex justify-center items-center gap-3 mb-10">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                !annualBilling
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                annualBilling
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Annual
            </button>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
            Save 20%
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Starter</h3>
              <p className="mt-2 text-sm text-slate-500">Everything you need to stay on top of your kitchen.</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">&#8377;</span>
                <span className="text-5xl font-bold tracking-tight text-slate-900">
                  {annualBilling ? "2,399" : "2,999"}
                </span>
                <span className="text-sm text-slate-500">
                  {annualBilling ? "/month ? billed annually" : "/month"}
                </span>
              </div>
              <div className="mt-2 min-h-[18px] text-xs font-semibold text-slate-500">
                {annualBilling ? "?28,788/year" : "?35,988/year"}
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {[
                "Up to 150 ingredients tracked",
                "Real-time stock levels",
                "Expiry & wastage alerts",
                "Reorder notifications (SMS + email)",
                "Mobile app access",
                "Onboarding support",
                "Demand forecasting",
                "POS integration",
                "Multi-outlet support",
              ].map((feature, index) => (
                <div key={feature} className="flex items-start gap-3 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${index < 6 ? "text-emerald-600" : "text-slate-300"}`} />
                  <span className={index < 6 ? "text-slate-700" : "text-slate-400"}>{feature}</span>
                </div>
              ))}
            </div>

            <a
              href="/register"
              className="mt-8 w-full rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-800 hover:border-emerald-500 hover:text-emerald-700 transition"
            >
              Start with Starter
            </a>
          </div>

          <div className="relative rounded-2xl border-2 border-emerald-500 bg-white p-8 shadow-lg flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-bold text-white">
              Most Popular
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Growth</h3>
              <p className="mt-2 text-sm text-slate-500">AI-powered intelligence for growing restaurant operations.</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">&#8377;</span>
                <span className="text-5xl font-bold tracking-tight text-slate-900">
                  {annualBilling ? "4,399" : "5,499"}
                </span>
                <span className="text-sm text-slate-500">
                  {annualBilling ? "/month ? billed annually" : "/month"}
                </span>
              </div>
              <div className="mt-2 min-h-[18px] text-xs font-semibold text-slate-500">
                {annualBilling ? "?52,788/year" : "?65,988/year"}
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {[
                "Unlimited ingredients",
                "AI demand forecasting",
                "Smart reorder recommendations",
                "POS integration (Toast, Square, etc.)",
                "Recipe cost tracking",
                "Usage & wastage analytics",
                "Up to 3 outlets",
                "Priority chat support",
                "Custom integrations",
              ].map((feature, index) => (
                <div key={feature} className="flex items-start gap-3 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${index < 8 ? "text-emerald-600" : "text-slate-300"}`} />
                  <span className={index < 8 ? "text-slate-700" : "text-slate-400"}>{feature}</span>
                </div>
              ))}
            </div>

            <a
              href="/register"
              className="mt-8 w-full rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
            >
              Start with Growth
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Enterprise</h3>
              <p className="mt-2 text-sm text-slate-500">For multi-location restaurant groups with custom needs.</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-slate-900">Custom</span>
              </div>
              <div className="mt-2 min-h-[18px] text-xs font-semibold text-slate-500">
                Tailored to your operation
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {[
                "Unlimited outlets",
                "Central dashboard for all locations",
                "Custom demand models",
                "Dedicated account manager",
                "Custom POS & ERP integrations",
                "Staff training & onboarding",
                "SLA-backed uptime",
                "White-label option",
                "API access",
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>

            <a
              href="/register"
              className="mt-8 w-full rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-800 hover:border-emerald-500 hover:text-emerald-700 transition"
            >
              Contact Sales
            </a>
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
