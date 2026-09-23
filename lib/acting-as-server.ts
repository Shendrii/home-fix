import { cookies } from "next/headers";
import { ACTING_AS_COOKIE, parseActingTarget, type ActingTarget } from "@/lib/acting-as";
import { createClient } from "@/lib/supabase/server";

export async function readActingTarget(): Promise<ActingTarget | null> {
  const cookieStore = await cookies();
  return parseActingTarget(cookieStore.get(ACTING_AS_COOKIE)?.value);
}

export async function describeActingTarget(target: ActingTarget) {
  const supabase = await createClient();
  if (!supabase) return target.role === "partner" ? "this company" : "this homeowner";
  if (target.companyId) {
    const { data } = await supabase.from("companies").select("name").eq("id", target.companyId).maybeSingle();
    return data?.name?.trim() || "this company";
  }
  const { data } = await supabase.from("profiles").select("full_name, email").eq("id", target.userId).maybeSingle();
  return data?.full_name?.trim() || data?.email?.trim() || "this homeowner";
}
