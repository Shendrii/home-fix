import { redirect } from "next/navigation";
import { postAuthDestination } from "@/lib/auth-return";
import { createClient } from "@/lib/supabase/server";

/** Sends already-signed-in users to their destination instead of auth screens. */
export async function redirectIfAuthenticated(returnTo?: string | null) {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, phone, default_address")
    .eq("id", user.id)
    .maybeSingle();

  redirect(postAuthDestination(profile, returnTo));
}
