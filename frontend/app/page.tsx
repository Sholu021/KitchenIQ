'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Clock,
  ChefHat,
  MessageSquare,
  MessageCircle,
  Calculator,
  ChevronRight,
  Plus,
  Minus,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { Boxes } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // ROI Calculator State
  const [monthlySpend, setMonthlySpend] = useState(15000);
  const [wastePercent, setWastePercent] = useState(18);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [yearlySavings, setYearlySavings] = useState(0);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isHydrated, router]);

  // Calculate Savings
  useEffect(() => {
    // Standard industry stat: AI inventory reduces waste by an average of 42%
    const currentWaste = monthlySpend * (wastePercent / 100);
    const savings = currentWaste * 0.42;
    setMonthlySavings(savings);
    setYearlySavings(savings * 12);
  }, [monthlySpend, wastePercent]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
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
    <div className="min-h-screen grid-bg text-slate-100 flex flex-col justify-between overflow-x-hidden">
      
      {/* --- HEADER NAVBAR --- */}
      <header className="h-20 max-w-7xl w-full mx-auto px-6 flex items-center justify-between z-10 sticky top-0 bg-[#080d1a]/80 backdrop-blur-md border-b border-slate-900/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <ChefHat size={22} />
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            KitchenIQ <span className="text-indigo-400">AI</span>
          </span>
        </div>
        
        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#roi" className="hover:text-white transition-colors">ROI Calculator</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>
        
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-bold px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] cursor-pointer"
          >
            Book Demo
          </Link>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-16 pb-20 px-6 max-w-6xl mx-auto z-10 text-center space-y-8">
        
        {/* Trusted Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Trusted by 1,400+ restaurants worldwide
        </div>

        {/* Big Main Headline */}
        <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Stop Food Waste & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f59e0b] to-[#ea580c]">
            Ingredient Shortages
          </span> <br />
          Before They Cost You Money
        </h1>

        {/* Sub-headline text */}
        <p className="text-sm sm:text-base text-slate-400 mt-6 max-w-3xl mx-auto leading-relaxed">
          KitchenIQ AI uses machine learning to predict what you&apos;ll run out of, when — and automatically suggests the right reorder before your kitchen runs dry. Average restaurant saves <strong className="text-white font-bold">$2,400/month</strong>.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto py-3.5 px-8 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            Book Free Demo <ArrowRight size={16} />
          </Link>
          <a
            href="https://wa.me/message/H5CMPBY5X675B1"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto py-3.5 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/10"
          >
            <MessageCircle size={18} /> WhatsApp Us
          </a>
        </div>
      </section>

      {/* --- APPLICATION SCREEN PREVIEW MOCKUP --- */}
      <section className="px-6 max-w-5xl mx-auto w-full z-10 pb-24">
        <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative p-1.5 bg-slate-950/40">
          {/* Mac window controls dot */}
          <div className="h-8 flex items-center gap-1.5 px-4 bg-[#0a0f1d] border-b border-slate-900">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 block"></span>
            <span className="text-[10px] text-slate-500 font-mono ml-4 uppercase tracking-wider">KitchenIQ AI v1.0 — Dashboard Live View</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 bg-[#080d1a] h-[480px]">
            {/* Mock Sidebar */}
            <div className="hidden md:flex flex-col gap-4 p-4 border-r border-slate-900 bg-[#0c1222]">
              <div className="h-8 flex items-center gap-2 border-b border-slate-900 pb-2">
                <ChefHat size={16} className="text-indigo-400" />
                <span className="text-xs font-bold text-white tracking-wider">KitchenIQ AI</span>
              </div>
              <div className="space-y-1">
                <div className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-2">
                  <TrendingUp size={12} /> Dashboard
                </div>
                <div className="px-3 py-1.5 text-slate-500 text-[10px] font-bold rounded-lg flex items-center gap-2">
                  <Layers size={12} /> Products
                </div>
                <div className="px-3 py-1.5 text-slate-500 text-[10px] font-bold rounded-lg flex items-center gap-2">
                  <Boxes size={12} /> Inventory
                </div>
                <div className="px-3 py-1.5 text-slate-500 text-[10px] font-bold rounded-lg flex items-center gap-2">
                  <Sparkles size={12} /> AI Insights
                </div>
              </div>
            </div>

            {/* Mock Main Content */}
            <div className="col-span-3 p-6 space-y-6 overflow-hidden flex flex-col justify-between">
              
              {/* Top stats cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0f1626] border border-slate-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Revenue Today</span>
                  <span className="text-base font-black text-white block mt-1">$1,450.00</span>
                </div>
                <div className="bg-[#0f1626] border border-slate-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Low Stock Items</span>
                  <span className="text-base font-black text-amber-400 block mt-1">3 Alerts</span>
                </div>
                <div className="bg-[#0f1626] border border-slate-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Expiring Batches</span>
                  <span className="text-base font-black text-rose-500 block mt-1">2 Batches</span>
                </div>
              </div>

              {/* Mock Chart representation */}
              <div className="bg-[#0f1626] border border-slate-900 rounded-xl p-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Weekly Consumption Pattern</span>
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">-24% Waste</span>
                </div>
                
                {/* Visual bar/line mockup */}
                <div className="h-28 flex items-end gap-3.5 pt-4">
                  <div className="flex-1 bg-indigo-600/10 rounded-t-lg h-[40%] relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-400">Mon</span></div>
                  <div className="flex-1 bg-indigo-600/20 rounded-t-lg h-[65%] relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-400">Tue</span></div>
                  <div className="flex-1 bg-indigo-600/30 rounded-t-lg h-[50%] relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-400">Wed</span></div>
                  <div className="flex-1 bg-indigo-600/60 rounded-t-lg h-[85%] relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-400">Thu</span></div>
                  <div className="flex-1 bg-[#f59e0b] rounded-t-lg h-[95%] relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white">Today</span></div>
                </div>
              </div>

              {/* Floating AI Notification widget */}
              <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Sparkles size={14} className="animate-spin duration-1000" />
                  <span><strong>AI Copilot:</strong> 3 items are expiring this week. Reorder suggestions generated.</span>
                </div>
                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 uppercase">Analyze</span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES SHOWCASE --- */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto w-full z-10 border-t border-slate-900/40">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Designed to Run a High-Margin Food Business
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Everything you need to sync recipes with raw material costings, monitor batch lifecycles, and automate vendor workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-56">
            <div>
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Tenant Isolation</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Franchise and organization data separation. User groups are strictly isolated, protecting sensitive database records.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-56">
            <div>
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit mb-4">
                <Clock size={20} />
              </div>
              <h3 className="text-base font-bold text-white">FEFO Expiry Warnings</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Allocation engine prioritizing batches based on actual expiration dates first, preventing slow-moving waste.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-56">
            <div>
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit mb-4">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Live Recipe Costing</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Computes margins dynamically based on raw product costs. When items sell, stock deducts automatically.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-56">
            <div>
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit mb-4">
                <Sparkles size={20} />
              </div>
              <h3 className="text-base font-bold text-white">AI Predictive Copilot</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask queries in natural language to identify dead stock, reorders, and receive supplier recommendation summaries.
            </p>
          </div>

        </div>
      </section>

      {/* --- INTERACTIVE ROI CALCULATOR --- */}
      <section id="roi" className="py-20 px-6 max-w-4xl mx-auto w-full z-10 border-t border-slate-900/40">
        <div className="glass-panel rounded-2xl p-8 border border-slate-900 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#f59e0b] to-[#ea580c]"></div>

          <div className="flex items-center gap-2 text-[#f59e0b] mb-4">
            <Calculator size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Waste Savings Optimizer</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">Estimate Your Kitchen Savings</h2>
          <p className="text-xs text-slate-400 mb-8 max-w-xl">Adjust your monthly food budget and average waste rates to calculate what you will save with KitchenIQ AI.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Sliders */}
            <div className="space-y-6">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Monthly Food Budget</span>
                  <span className="text-white font-mono">${monthlySpend.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="100000"
                  step="1000"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$2k</span>
                  <span>$100k</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Estimated Food Waste Rate</span>
                  <span className="text-white font-mono">{wastePercent}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={wastePercent}
                  onChange={(e) => setWastePercent(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5% (Optimal)</span>
                  <span>40% (Severe)</span>
                </div>
              </div>

            </div>

            {/* Calculations display */}
            <div className="flex flex-col justify-center bg-slate-950/40 p-6 border border-slate-900 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl -z-10"></div>
              
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Monthly Savings</span>
                  <span className="text-2xl font-black text-white mt-1 block font-mono">
                    ${monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-900">
                  <span className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider block">Projected Yearly Savings</span>
                  <span className="text-4xl font-black text-[#f59e0b] mt-1 block font-mono">
                    ${yearlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="py-20 px-6 max-w-6xl mx-auto w-full z-10 border-t border-slate-900/40">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Flexible Plans for Every Stage</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Select the scale that fits your food operations. Lock in high-margin tools and stop food waste immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan 1 */}
          <div className="glass-panel rounded-2xl p-8 border border-slate-900 flex flex-col justify-between h-[450px]">
            <div>
              <h3 className="text-lg font-bold text-white">Bistro</h3>
              <p className="text-xs text-slate-400 mt-2">Best for small cafes and cloud kitchens.</p>
              
              <div className="my-6">
                <span className="text-4xl font-black text-white font-mono">$49</span>
                <span className="text-xs text-slate-500"> / month</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Up to 100 products catalog</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Recipe margin calculator</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Manual inventory logs & batches</span>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold rounded-xl text-center text-xs transition-colors cursor-pointer"
            >
              Start Bistro Trial
            </Link>
          </div>

          {/* Plan 2 - Featured */}
          <div className="glass-panel rounded-2xl p-8 border border-indigo-500/30 flex flex-col justify-between h-[470px] relative -translate-y-2.5 bg-slate-950/20 shadow-2xl">
            {/* Featured flag */}
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-400/30">
              Most Popular
            </span>

            <div>
              <h3 className="text-lg font-bold text-white mt-2">Trattoria</h3>
              <p className="text-xs text-slate-400 mt-2">Ideal for high-volume restaurants and bakeries.</p>
              
              <div className="my-6">
                <span className="text-4xl font-black text-white font-mono">$99</span>
                <span className="text-xs text-slate-500"> / month</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Unlimited products & suppliers</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>FEFO Expiry batch warnings</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Automated PO Lifecycle & Receiving</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>AI Predictions & Natural Copilot</span>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-center text-xs transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer"
            >
              Start Trattoria Trial
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="glass-panel rounded-2xl p-8 border border-slate-900 flex flex-col justify-between h-[450px]">
            <div>
              <h3 className="text-lg font-bold text-white">Grand Cuisine</h3>
              <p className="text-xs text-slate-400 mt-2">Enterprise level controls for chains and cloud kitchens.</p>
              
              <div className="my-6">
                <span className="text-4xl font-black text-white font-mono">Custom</span>
                <span className="text-xs text-slate-500"> / annual billing</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Multi-outlet synchronization</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Custom POS integration endpoints</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                  <span>Dedicated Support Account Director</span>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold rounded-xl text-center text-xs transition-colors cursor-pointer"
            >
              Contact Sales
            </Link>
          </div>

        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto w-full z-10 border-t border-slate-900/40">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">Common operational queries about tenant isolation, setups, and AI prediction accuracy.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-[#0f1626] border border-slate-900 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 flex items-center justify-between text-left font-bold text-white text-sm cursor-pointer select-none"
                >
                  <span>{faq.q}</span>
                  <span className={`text-slate-500 font-semibold text-lg transition-transform ${isOpen ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-900/40 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-900 bg-[#0c1222]/30 py-12 px-6 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <ChefHat size={18} />
            </div>
            <span className="text-sm font-black text-white tracking-tight">
              KitchenIQ <span className="text-indigo-400">AI</span>
            </span>
          </div>
          
          <div className="flex gap-8 text-[11px] text-slate-500 font-semibold">
            <a href="#features" className="hover:text-slate-300">Features</a>
            <a href="#roi" className="hover:text-slate-300">ROI Calculator</a>
            <a href="#pricing" className="hover:text-slate-300">Pricing</a>
            <a href="#faq" className="hover:text-slate-300">FAQ</a>
          </div>

          <div className="text-[11px] text-slate-600 font-mono">
            &copy; {new Date().getFullYear()} KitchenIQ AI. Stop Waste, Save Margins.
          </div>
        </div>
      </footer>

    </div>
  );
}
