import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/profile";

export async function getOptionalProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, default_address, avatar_url, created_at, updated_at, email")
    .eq("id", user.id)
    .single();
  return (data as Profile | null) ?? null;
}
