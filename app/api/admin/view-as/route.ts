import { NextResponse } from "next/server";
import { ACTING_AS_COOKIE, serializeActingTarget, type ActingTarget } from "@/lib/acting-as";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

function withTarget(target: ActingTarget, redirectTo: string) {
  const response = NextResponse.json({ redirectTo });
  response.cookies.set(ACTING_AS_COOKIE, serializeActingTarget(target), {
    ...cookieOptions,
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server configuration missing." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Only superadmins can view as another account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { companyId?: string; userId?: string } | null;
  const companyId = body?.companyId?.trim() || "";
  const userId = body?.userId?.trim() || "";
  if (Boolean(companyId) === Boolean(userId) || (companyId && !uuid.test(companyId)) || (userId && !uuid.test(userId))) {
    return NextResponse.json({ error: "Provide a company or a user to view as." }, { status: 400 });
  }

  if (companyId) {
    const { data: company } = await supabase.from("companies").select("id, owner_id").eq("id", companyId).maybeSingle();
    if (!company?.owner_id) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    return withTarget(
      { type: "company", role: "partner", userId: company.owner_id, companyId: company.id },
      "/partner",
    );
  }

  const { data: person } = await supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  if (!person) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (person.role === "client") {
    return withTarget({ type: "client", role: "client", userId: person.id, companyId: null }, "/dashboard");
  }
  if (person.role === "partner") {
    const { data: company } = await supabase.from("companies").select("id").eq("owner_id", person.id).maybeSingle();
    if (!company) return NextResponse.json({ error: "This partner has no company yet." }, { status: 404 });
    return withTarget({ type: "company", role: "partner", userId: person.id, companyId: company.id }, "/partner");
  }
  if (person.role === "admin") {
    return withTarget({ type: "admin", role: "admin", userId: person.id, companyId: null }, "/admin");
  }
  return NextResponse.json({ error: "Superadmin accounts cannot be viewed as." }, { status: 400 });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTING_AS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
