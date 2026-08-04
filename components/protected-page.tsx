import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { authPathWithReturn } from "@/lib/auth-return";
import { profileNeedsPersonalDetails, type Profile } from "@/lib/profile";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export type { Profile };

export async function ProtectedPage({
  children,
  allow,
  signInNext,
  allowIncompleteClientProfile = false,
}: {
  children: React.ReactNode;
  allow: Role[];
  /** After sign-in, return here (e.g. /request?service=plumbing). */
  signInNext?: string;
  /** Only `/account` should set this so onboarding can finish before other routes unlock. */
  allowIncompleteClientProfile?: boolean;
}) {
  if (!isSupabaseConfigured) {
    return <AppShell role="client" profile={null}><ConfigurationHint /></AppShell>;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect(authPathWithReturn("/auth/sign-in", signInNext));
  const { data } = await supabase!
    .from("profiles")
    .select("id, full_name, role, phone, default_address, avatar_url, created_at, updated_at, email")
    .eq("id", user.id)
    .single();
  const profile = data as Profile | null;
  if (!profile || !allow.includes(profile.role)) redirect("/unauthorized");

  if (
    !allowIncompleteClientProfile &&
    profile.role === "client" &&
    profileNeedsPersonalDetails(profile)
  ) {
    redirect("/account");
  }

  const onboardingLock =
    profile.role === "client" && profileNeedsPersonalDetails(profile);

  return (
    <AppShell role={profile.role} profile={profile} onboardingLock={onboardingLock}>
      {children}
    </AppShell>
  );
}

export function ConfigurationHint() {
  return <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-950"><h1 className="text-xl font-bold">Connect HomeFix to Supabase</h1><p className="mt-2 text-sm leading-6">Add the Supabase URL and publishable key to <code>.env.local</code> using <code>.env.example</code>, then restart the app.</p></div>;
}
