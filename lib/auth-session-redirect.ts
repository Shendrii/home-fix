import { redirect } from "next/navigation";
import { isClientBookingPath, safeReturnTo } from "@/lib/auth-return";
import { profileNeedsPersonalDetails } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function roleHome(role: string | null | undefined) {
  if (role === "partner") return "/partner";
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

/** Sends already-signed-in users to their destination instead of auth screens. */
export async function redirectIfAuthenticated(returnTo?: string | null) {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const next = safeReturnTo(returnTo);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, phone, default_address")
    .eq("id", user.id)
    .maybeSingle();

  if (next && profile?.role === "client" && isClientBookingPath(next)) {
    redirect(next);
  }

  if (profile?.role === "client" && profileNeedsPersonalDetails(profile)) {
    redirect("/account");
  }

  redirect(roleHome(profile?.role));
}
