import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">← Back to KitchenIQ</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: September 28, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
          <section><h2 className="text-xl font-bold text-slate-900">1. Service</h2><p className="mt-2">KitchenIQ provides restaurant operations software for inventory, purchasing, recipes, production, waste, sales, analytics, reporting, and AI-assisted operational insights. Features may change as the service is improved.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">2. Accounts</h2><p className="mt-2">You are responsible for providing accurate account information, protecting your credentials, and ensuring that people using your organization account are authorized to do so. Organization owners are responsible for managing roles and access.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">3. Trial and subscriptions</h2><p className="mt-2">New customers receive a 14-day trial without a credit card. After the trial, continued access requires a paid subscription unless otherwise stated. The Pro plan is ₹2,999 per month or ₹28,788 per year when billed annually. Prices are shown before payment and may be changed for future billing periods.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">4. Payments and cancellation</h2><p className="mt-2">Payments are processed through Razorpay. You may cancel a subscription at any time; unless otherwise stated, paid access continues through the current billing period. Refund terms are described separately in the Refund &amp; Cancellation Policy.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">5. Acceptable use</h2><p className="mt-2">You may not use KitchenIQ to violate applicable law, interfere with the service, attempt unauthorized access, bypass security controls, misuse another organization's data, or introduce malicious code.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">6. Your data</h2><p className="mt-2">You retain responsibility for the restaurant and business data you enter into KitchenIQ. We process that data to provide the service, maintain security, support customers, and operate the platform as described in our Privacy Policy.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">7. AI features</h2><p className="mt-2">AI Insights and AI Copilot provide operational assistance based on available restaurant data. AI output can be incomplete or incorrect and should be reviewed by a responsible operator before business decisions are made.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">8. Availability</h2><p className="mt-2">We aim to keep KitchenIQ available and reliable, but uninterrupted service is not guaranteed. Maintenance, provider outages, network failures, security incidents, and other events may temporarily affect availability.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">9. Changes</h2><p className="mt-2">We may update these terms as the service or applicable requirements change. Material changes will be communicated through the service or another reasonable channel.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">10. Contact</h2><p className="mt-2">For account, billing, or service questions, contact <a className="font-semibold text-emerald-700" href="mailto:support@kitcheniq.ai">support@kitcheniq.ai</a>.</p></section>
        </div>
      </div>
    </main>
  );
}
