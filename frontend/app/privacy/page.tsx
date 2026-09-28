import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">← Back to KitchenIQ</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: September 28, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
          <section><h2 className="text-xl font-bold text-slate-900">1. Information we process</h2><p className="mt-2">KitchenIQ may process account details such as name and email address; organization details; restaurant operational data such as products, inventory, suppliers, recipes, production, waste, sales, and reports; subscription and billing identifiers; audit and security events; and technical information needed to operate and secure the service.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">2. How we use information</h2><p className="mt-2">We use information to authenticate users, provide restaurant workflows, calculate analytics and operational insights, process subscriptions, prevent abuse, maintain security, troubleshoot problems, provide support, and improve the service.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">3. Organization data</h2><p className="mt-2">Restaurant operational data is associated with the organization that created it. Access controls are designed to restrict users to authorized organization data and role permissions.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">4. Payments and service providers</h2><p className="mt-2">Subscription payments are processed by Razorpay. KitchenIQ also relies on infrastructure and hosting providers to operate the application and database. These providers process information as necessary to deliver their services.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">5. AI-assisted features</h2><p className="mt-2">When AI-assisted features use an external AI provider, relevant operational context may be transmitted to that provider to generate the requested response. KitchenIQ also includes data-driven fallback behavior for supported insights when an external AI provider is unavailable or not configured.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">6. Security</h2><p className="mt-2">KitchenIQ uses authentication, role-based authorization, organization scoping, audit logging, encrypted transport, secure session cookies, CSRF protections, and other controls intended to protect customer information. No internet service can guarantee absolute security.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">7. Retention and deletion</h2><p className="mt-2">We retain information for as long as reasonably necessary to provide the service, meet legitimate operational needs, resolve disputes, maintain security, and satisfy applicable obligations. Customers may request account or data deletion by contacting support; requests may be subject to verification and applicable retention requirements.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">8. Your choices</h2><p className="mt-2">You can request access, correction, export, or deletion of your account information and organization data, subject to verification, technical limitations, and applicable requirements. Contact support to begin a request.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900">9. Contact</h2><p className="mt-2">Privacy questions and data requests can be sent to <a className="font-semibold text-emerald-700" href="mailto:support@kitcheniq.ai">support@kitcheniq.ai</a>.</p></section>
        </div>
      </div>
    </main>
  );
}
