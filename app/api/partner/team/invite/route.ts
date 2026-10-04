import { NextResponse } from "next/server";
import { readActingTarget } from "@/lib/acting-as-server";
import { parseTeamInvite } from "@/lib/company-membership";
import { buildAuthCallbackUrl } from "@/lib/oauth-callback";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type InviteBody = {
  email?: string;
  role?: string;
};

async function resolveInvitingUser(request: Request) {
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  }

  const admin = createAdminClient();
  if (!admin) return null;

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server configuration missing: SUPABASE_SERVICE_ROLE_KEY is required." },
      { status: 503 },
    );
  }

  const user = await resolveInvitingUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as InviteBody | null;
  const invite = parseTeamInvite(body);
  if (!invite) {
    return NextResponse.json({ error: "Provide a valid email and choose Admin or Staff." }, { status: 400 });
  }
  const { email, role } = invite;

  const { data: caller } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const acting = caller?.role === "superadmin" ? await readActingTarget() : null;

  let companyId: string | null = null;
  if (acting?.role === "partner" && acting.companyId) {
    const { data: viewed } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", acting.companyId)
      .eq("user_id", acting.userId)
      .maybeSingle();
    if (viewed?.role === "admin") companyId = acting.companyId;
  } else {
    const { data: membership } = await admin
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    companyId = membership?.company_id ?? null;
  }

  if (!companyId) {
    return NextResponse.json({ error: "Only a company admin can invite people." }, { status: 403 });
  }

  const { data: company } = await admin
    .from("companies")
    .select("id, name, phone, service_area, operating_hours, company_services(service_category_id)")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  const { data: existingProfile } = await admin.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (existingProfile?.role === "admin" || existingProfile?.role === "superadmin") {
    return NextResponse.json({ error: "HomeFix operations accounts cannot join a partner company." }, { status: 409 });
  }
  if (existingProfile?.id) {
    const { data: existingMembership } = await admin
      .from("company_members")
      .select("company_id")
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (existingMembership) {
      return NextResponse.json(
        { error: "This person already belongs to a company. They cannot join a second one." },
        { status: 409 },
      );
    }
  }

  const categoryIds = ((company.company_services ?? []) as { service_category_id: string }[]).map(
    (service) => service.service_category_id,
  );
  const { data: invitation, error: invitationError } = await admin
    .from("partner_invitations")
    .insert({
      email,
      company_name: company.name,
      phone: company.phone,
      service_area: company.service_area,
      operating_hours: company.operating_hours ?? {},
      service_category_ids: categoryIds,
      invited_by: user.id,
      target_company_id: company.id,
      member_role: role,
    })
    .select("id")
    .single();

  if (invitationError || !invitation) {
    return NextResponse.json({ error: invitationError?.message ?? "Unable to save invitation." }, { status: 400 });
  }

  const { data: fulfillData, error: fulfillError } = await admin.rpc("fulfill_partner_invitation", {
    p_invitation_id: invitation.id,
  });
  if (fulfillError) {
    await admin.from("partner_invitations").delete().eq("id", invitation.id);
    return NextResponse.json({ error: fulfillError.message }, { status: 400 });
  }

  const fulfillStatus = (fulfillData as { status?: string } | null)?.status;
  const roleLabel = role === "admin" ? "an admin" : "staff";
  const origin = new URL(request.url).origin;

  if (fulfillStatus === "pending_signup") {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: buildAuthCallbackUrl(origin, { intent: "signup", next: "/partner" }),
      data: { company_name: company.name },
    });
    if (inviteError) {
      await admin.from("partner_invitations").delete().eq("id", invitation.id);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      status: "invitation_email_sent",
      message: `Signup invite sent. They join ${company.name} as ${roleLabel} when they accept.`,
    });
  }

  if (fulfillStatus === "already_provisioned") {
    await admin.from("partner_invitations").delete().eq("id", invitation.id);
    return NextResponse.json(
      { error: "This person already belongs to a company. They cannot join a second one." },
      { status: 409 },
    );
  }

  if (fulfillStatus === "provisioned") {
    const provisioned = fulfillData as { user_id?: string };
    if (provisioned.user_id) {
      await admin.from("notifications").insert({
        recipient_id: provisioned.user_id,
        title: `You're on the ${company.name} team`,
        body: `You were added as ${roleLabel}. Open the partner workspace to work the shared job queue.`,
      });
      await admin.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: buildAuthCallbackUrl(origin, { intent: "signin", next: "/partner" }),
        },
      });
    }
    return NextResponse.json({
      ok: true,
      status: "provisioned",
      message: `Added to ${company.name} as ${roleLabel}. They can sign in and open the partner workspace.`,
    });
  }

  return NextResponse.json({ ok: true, status: fulfillStatus ?? "unknown" });
}
