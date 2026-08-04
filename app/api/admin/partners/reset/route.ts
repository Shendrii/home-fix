import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function resolveSuperadmin(request: Request) {
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ error: "Server configuration missing." }, { status: 503 }) };

  const supabase = await createClient();
  let userId: string | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token) {
      const {
        data: { user },
      } = await admin.auth.getUser(token);
      userId = user?.id ?? null;
    }
  }

  if (!userId) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role !== "superadmin") {
    return { error: NextResponse.json({ error: "Only superadmins can reset partner accounts." }, { status: 403 }) };
  }

  return { admin };
}

export async function POST(request: Request) {
  const resolved = await resolveSuperadmin(request);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { admin } = resolved;

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Provide a valid partner email." }, { status: 400 });
  }

  const { data, error } = await admin!.rpc("admin_reset_partner_account", { p_email: email });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
}
