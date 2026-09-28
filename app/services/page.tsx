import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesScreen } from "@/components/screens";
import { resolveServicesPageVariant } from "@/lib/auth-display";
import { describeActingTarget, readActingTarget } from "@/lib/acting-as-server";
import { getOptionalProfile } from "@/lib/auth-session";
import { profileNeedsPersonalDetails } from "@/lib/profile";

export default async function ServicesPage() {
  const profile = await getOptionalProfile();
  const acting = profile?.role === "superadmin" ? await readActingTarget() : null;
  const variant = resolveServicesPageVariant(profile, acting?.role === "client" ? "client" : null);

  if (variant === "admin-only") redirect("/admin");

  if (variant === "client-app" && profile) {
    if (!acting && profile.role === "client" && profileNeedsPersonalDetails(profile)) {
      redirect("/account");
    }
    const actingLabel = acting ? await describeActingTarget(acting) : null;
    return (
      <AppShell role="client" profile={profile} actingLabel={actingLabel}>
        <ServicesScreen />
      </AppShell>
    );
  }

  return (
    <main className="min-h-dvh bg-[#faf8f3] text-slate-950">
      <PublicSiteHeader />
      <div className="mx-auto max-w-7xl px-5 py-10">
        <ServicesScreen />
      </div>
    </main>
  );
}
