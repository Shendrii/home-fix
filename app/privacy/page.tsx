import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-background px-5 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl bg-card p-7 shadow-[0_18px_60px_oklch(0.24_0.045_245/0.08)]">
        <Link href="/" className="rounded-md font-bold text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">← HomeFix</Link>
        <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          HomeFix collects account details (such as email and name), service request information, and operational activity needed to match jobs, notify partners, and secure the marketplace.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Authentication is handled by Supabase. We do not sell personal data. Access to admin tools is limited to authorized operators. You can request account support through the email associated with your profile.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          This is a starter policy for product development. Replace it with counsel-reviewed privacy terms before public launch.
        </p>
      </article>
    </main>
  );
}
