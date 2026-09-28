import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">← Back to KitchenIQ</Link>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Customer Support</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">We’re here to help.</h1>
          <p className="mt-4 max-w-2xl text-slate-600">For setup, account, billing, data, or product questions, email our support team. We target a response within 1 business day.</p>
          <a href="mailto:support@kitcheniq.ai" className="mt-8 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">Email support@kitcheniq.ai</a>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-5"><h2 className="font-bold">Product</h2><p className="mt-2 text-sm text-slate-600">Questions about inventory, purchasing, recipes, production, analytics, or AI features.</p></div>
            <div className="rounded-2xl bg-slate-50 p-5"><h2 className="font-bold">Billing</h2><p className="mt-2 text-sm text-slate-600">Subscription, payment, cancellation, and refund questions.</p></div>
            <div className="rounded-2xl bg-slate-50 p-5"><h2 className="font-bold">Data</h2><p className="mt-2 text-sm text-slate-600">Account access, exports, privacy requests, and deletion requests.</p></div>
          </div>
        </div>
      </div>
    </main>
  );
}
