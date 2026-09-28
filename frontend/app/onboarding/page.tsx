'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, ArrowRight, ChefHat } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

const steps = [
  { key: 'products', title: 'Add your ingredients and products', description: 'Start with the ingredients you use most often.', href: '/products' },
  { key: 'inventory', title: 'Set your opening stock', description: 'Record current quantities so KitchenIQ can calculate inventory health.', href: '/inventory' },
  { key: 'recipes', title: 'Add your key recipes', description: 'Connect ingredients to menu items and understand recipe costs.', href: '/recipes' },
  { key: 'sales', title: 'Record recent sales', description: 'Add sales data so analytics and AI recommendations have useful context.', href: '/sales' },
  { key: 'insights', title: 'Review AI Insights', description: 'See stock risks, waste signals, and recommended operational priorities.', href: '/ai-insights' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isHydrated, router]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('kitcheniq_onboarding_completed');
      if (raw) setCompleted(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (key: string) => {
    const next = completed.includes(key) ? completed.filter((item) => item !== key) : [...completed, key];
    setCompleted(next);
    window.localStorage.setItem('kitcheniq_onboarding_completed', JSON.stringify(next));
  };

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><ChefHat size={24} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">KitchenIQ Pro</p>
            <h1 className="text-3xl font-bold tracking-tight">Let’s set up your kitchen.</h1>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-slate-600">
          Follow these five steps to get useful inventory, analytics, and AI recommendations. You can skip any step and return later.
        </p>

        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-900">14-day free trial</p>
              <p className="mt-1 text-xs text-emerald-800">No credit card required. Add real kitchen data first so you can evaluate the product properly.</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-emerald-700">{completed.length}/5 complete</span>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {steps.map((step, index) => {
            const done = completed.includes(step.key);
            return (
              <div key={step.key} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <button type="button" onClick={() => toggle(step.key)} aria-label={done ? 'Mark step incomplete' : 'Mark step complete'} className="shrink-0 text-emerald-600">
                  {done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={done ? 'text-sm font-bold text-slate-400 line-through' : 'text-sm font-bold text-slate-900'}>{index + 1}. {step.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{step.description}</p>
                </div>
                <Link href={step.href} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700">
                  Open <ArrowRight size={13} />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
            Go to Dashboard
          </Link>
          <Link href="/settings" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:border-emerald-300">
            Configure Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
