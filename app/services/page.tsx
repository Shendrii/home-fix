import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesScreen } from "@/components/screens";
import { resolveServicesPageVariant } from "@/lib/auth-display";
import { getOptionalProfile } from "@/lib/auth-session";
import { profileNeedsPersonalDetails } from "@/lib/profile";

export default async function ServicesPage() {
  const profile = await getOptionalProfile();
  const variant = resolveServicesPageVariant(profile);

  if (variant === "client-app" && profile) {
    if (profileNeedsPersonalDetails(profile)) {
      redirect("/account");
    }
    return (
      <AppShell role="client" profile={profile}>
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
