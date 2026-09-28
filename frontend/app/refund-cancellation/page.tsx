import Link from "next/link";

export default function RefundCancellationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">← Back to KitchenIQ</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Refund &amp; Cancellation Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: September 28, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
          <section><h2 className="text-xl font-bold text-slate-900">14-day trial</h2><p className="mt-2">New customers receive a 14-day free trial. No payment is required to start the trial. When the trial ends, continued Pro access requires a paid subscription.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">7-day refund window</h2><p className="mt-2">A customer may request a refund within 7 calendar days of the first paid subscription charge. Refund requests after that initial 7-day window are generally not refundable unless required by applicable law or approved as an exception.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">Cancellation</h2><p className="mt-2">You may cancel at any time from the subscription controls available to the organization owner. Cancellation stops automatic renewal; Pro access remains available through the end of the already-paid billing period unless otherwise required.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">Annual subscriptions</h2><p className="mt-2">Annual subscriptions are billed upfront at ₹28,788. The same 7-day refund window applies to the first annual charge. After that window, unused time is generally not prorated or refunded.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">How to request a refund</h2><p className="mt-2">Email <a className="font-semibold text-emerald-700" href="mailto:support@kitcheniq.ai">support@kitcheniq.ai</a> with the account email, organization name, charge date, and reason for the request. We may verify account ownership before processing a request.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">Processing</h2><p className="mt-2">Approved refunds are returned through the applicable payment method and are subject to payment-provider processing timelines.</p></section>
        </div>
      </div>
    </main>
  );
}
