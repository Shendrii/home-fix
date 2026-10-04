import Link from "next/link";

export default function TermsPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-background px-5 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl bg-card p-7 shadow-[0_18px_60px_oklch(0.24_0.045_245/0.08)]">
        <Link href="/" className="rounded-md font-bold text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">← HomeFix</Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">Terms of Service</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          HomeFix connects clients with partner companies for home services. By creating an account or using the platform, you agree to use the service lawfully, provide accurate request details, and respect partner and client safety.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Marketplace jobs are accepted by the first eligible partner. Pricing, scheduling, and workmanship remain between you and the assigned partner unless HomeFix states otherwise. We may suspend accounts that abuse the platform, spam partners, or attempt unauthorized access.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          This is a starter policy for product development. Replace it with counsel-reviewed terms before public launch.
        </p>
      </article>
    </main>
  );
}
