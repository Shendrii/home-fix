import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server configuration missing." }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase!.auth.getUser();
  if (!actor) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: actorProfile } = await admin.from("profiles").select("role").eq("id", actor.id).maybeSingle();
  if (actorProfile?.role !== "superadmin") {
    return NextResponse.json({ error: "Only superadmins can edit user profiles." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    full_name?: string;
    phone?: string;
    default_address?: string;
  } | null;
  const id = body?.id?.trim() ?? "";
  const fullName = body?.full_name?.trim() ?? "";
  const phone = body?.phone?.trim() ?? "";
  const address = body?.default_address?.trim() ?? "";

  if (!uuid.test(id) || !fullName || !phone || !address) {
    return NextResponse.json({ error: "Name, phone, and default address are required." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      default_address: address,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, email, full_name, phone, default_address, role")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "User not found." }, { status: 400 });

  return NextResponse.json({ user: data });
}
