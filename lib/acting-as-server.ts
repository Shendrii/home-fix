import { cookies } from "next/headers";
import { ACTING_AS_COOKIE, actingDisplayName, parseActingTarget, type ActingTarget } from "@/lib/acting-as";
import { createClient } from "@/lib/supabase/server";

export async function readActingTarget(): Promise<ActingTarget | null> {
  const cookieStore = await cookies();
  return parseActingTarget(cookieStore.get(ACTING_AS_COOKIE)?.value);
}

export async function describeActingTarget(target: ActingTarget) {
  const supabase = await createClient();
  if (!supabase) return "this user";
  const { data } = await supabase.from("profiles").select("full_name, email").eq("id", target.userId).maybeSingle();
  return actingDisplayName(data);
}
