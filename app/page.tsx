import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { HomeAppointmentSection } from "@/components/home-appointment-section";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-site-header";
import { authPathWithReturn, postAuthDestination } from "@/lib/auth-return";
import { authErrorToSignInParam } from "@/lib/oauth-callback";
import { createClient } from "@/lib/supabase/server";

const primaryLink =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring active:translate-y-px";
const secondaryLink =
  "inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-5 font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring active:translate-y-px";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string }>;
}) {
  const params = await searchParams;
  if (params.error) {
    redirect(`/auth/sign-in?error=${authErrorToSignInParam(params.error_code ?? params.error)}`);
  }

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
    <div className="min-h-dvh bg-background text-foreground">
      <PublicSiteHeader />
      <main id="main-content">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
          <div>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              Book the visit. Know who is coming.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
              Describe the problem, pick a window, and a verified local professional confirms the scope before any work starts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/services" className={primaryLink}>
                Browse services <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href={authPathWithReturn("/auth/sign-in", "/request")} className={secondaryLink}>
                Sign in to book
              </Link>
            </div>
          </div>
          <aside
            aria-label="Example appointment"
            className="rounded-3xl bg-card p-6 shadow-[0_18px_50px_oklch(0.24_0.045_245/0.08)] ring-1 ring-border sm:p-8"
          >
            <p className="text-sm font-semibold text-primary">Example appointment</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-balance">Kitchen sink leak</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Service</dt>
                <dd className="mt-0.5 font-semibold">Plumbing</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Window</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">Tomorrow, 9:00–11:00</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Who is coming</dt>
                <dd className="mt-0.5 font-semibold">Harbor Plumbing</dd>
                <dd className="mt-1 text-muted-foreground">Verified partner. Confirms the scope before work starts.</dd>
              </div>
            </dl>
          </aside>
        </section>
        <HomeAppointmentSection />
      </main>
      <PublicSiteFooter />
    </div>
  );
}
