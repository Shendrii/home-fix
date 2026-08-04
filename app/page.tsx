import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, ShieldCheck, Wrench } from "lucide-react";
import { HomeAppointmentSection } from "@/components/home-appointment-section";
import { PublicSiteHeader } from "@/components/public-site-header";
import { postAuthDestination } from "@/lib/auth-return";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, phone, default_address")
        .eq("id", user.id)
        .maybeSingle();
      redirect(postAuthDestination(profile, null));
    }
  }

  return (
    <main className="min-h-dvh bg-[#faf8f3] text-slate-950">
      <PublicSiteHeader />
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="font-semibold text-teal-700">Trusted help for every corner of home</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">A better way to get things fixed.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Tell us what needs attention. Verified local professionals compete to help, and you stay in control from request to completion.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/services" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-semibold text-white transition-colors hover:bg-teal-700">Find a professional <ArrowRight className="size-4" /></Link>
            <Link href="/auth/sign-in" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-800 transition-colors hover:bg-slate-50">Sign in to book</Link>
          </div>
        </div>
        <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl"><p className="text-teal-300">This week in your neighborhood</p><p className="mt-3 text-3xl font-bold">Home help, without the hassle.</p><div className="mt-8 grid grid-cols-2 gap-3">{["Plumbing", "Electrical", "Cleaning", "HVAC"].map((name) => <div key={name} className="rounded-2xl bg-white/10 p-4"><Wrench className="size-5 text-teal-300" /><p className="mt-5 font-semibold">{name}</p><p className="text-xs text-slate-300">Verified nearby pros</p></div>)}</div></div>
      </section>
      <HomeAppointmentSection />
      <section className="border-y bg-white py-14"><div className="mx-auto max-w-7xl px-5"><h2 className="text-2xl font-bold">How HomeFix works</h2><div className="mt-7 grid gap-5 md:grid-cols-3">{[["1", "Describe the job"], ["2", "Get matched safely"], ["3", "Track it to done"]].map(([number, label]) => <div key={number} className="rounded-2xl bg-[#faf8f3] p-5"><span className="font-bold text-teal-700">{number}</span><p className="mt-4 font-bold">{label}</p><p className="mt-2 text-sm text-slate-600">Clear updates and support at every step.</p></div>)}</div></div></section>
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-14 md:grid-cols-2"><div className="flex gap-4 rounded-2xl bg-teal-50 p-6"><BadgeCheck className="size-7 shrink-0 text-teal-700" /><div><h2 className="font-bold">Verified professionals</h2><p className="mt-1 text-sm text-slate-600">Partners are provisioned securely by HomeFix operations.</p></div></div><div className="flex gap-4 rounded-2xl bg-teal-50 p-6"><ShieldCheck className="size-7 shrink-0 text-teal-700" /><div><h2 className="font-bold">Built around trust</h2><p className="mt-1 text-sm text-slate-600">Your request and updates stay with your account.</p></div></div></section>
    </main>
  );
}
