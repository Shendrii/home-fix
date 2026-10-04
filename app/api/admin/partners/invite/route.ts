import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildAuthCallbackUrl } from "@/lib/oauth-callback";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InviteBody = {
  email?: string;
  company_name?: string;
  phone?: string;
  service_area?: string;
  company_description?: string;
  service_category_ids?: string[];
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
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Only superadmins can invite partners." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as InviteBody | null;
  if (
    !body ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email ?? "") ||
    !body.company_name?.trim() ||
    !Array.isArray(body.service_category_ids) ||
    body.service_category_ids.length === 0 ||
    !body.service_category_ids.every((id) => uuid.test(id))
  ) {
    return NextResponse.json(
      { error: "Provide a company name, valid email, and one or more service categories." },
      { status: 400 },
    );
  }

  const email = body.email!.toLowerCase();
  const companyName = body.company_name!.trim();
  const serviceCategoryIds = body.service_category_ids!;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    const { data: membership } = await admin
      .from("company_members")
      .select("company_id")
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (membership?.company_id) {
      const { data: existingCompany } = await admin
        .from("companies")
        .select("name")
        .eq("id", membership.company_id)
        .maybeSingle();
      return NextResponse.json(
        {
          error: `This email already belongs to “${existingCompany?.name ?? "a partner company"}”. Choose Remove partner account under the form to invite them again.`,
        },
        { status: 409 },
      );
    }
  }

  const { data: invitation, error: invitationError } = await admin
    .from("partner_invitations")
    .insert({
      email,
      company_name: companyName,
      phone: body.phone?.trim() || null,
      service_area: body.service_area?.trim() || null,
      company_description: body.company_description?.trim() || null,
      service_category_ids: serviceCategoryIds,
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (invitationError || !invitation) {
    return NextResponse.json(
      { error: invitationError?.message ?? "Unable to save invitation." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;

  const { data: fulfillData, error: fulfillError } = await admin.rpc("fulfill_partner_invitation", {
    p_invitation_id: invitation.id,
  });

  if (fulfillError) {
    await admin.from("partner_invitations").delete().eq("id", invitation.id);
    return NextResponse.json({ error: fulfillError.message }, { status: 400 });
  }

  const fulfillStatus = (fulfillData as { status?: string } | null)?.status;

  if (fulfillStatus === "pending_signup") {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: buildAuthCallbackUrl(origin, { intent: "signup" }),
      data: { company_name: companyName },
    });
    if (inviteError) {
      await admin.from("partner_invitations").delete().eq("id", invitation.id);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      status: "invitation_email_sent",
      message: "Supabase sent a signup invite to this email. They must accept it to create their login.",
    });
  }

  if (fulfillStatus === "provisioned") {
    const provisioned = fulfillData as { user_id?: string; company_id?: string };
    if (provisioned.user_id) {
      await admin.from("notifications").insert({
        recipient_id: provisioned.user_id,
        title: "You're a HomeFix partner",
        body: `${companyName} is ready. Sign in and open your partner workspace to go on duty and accept jobs.`,
      });

      const { error: otpError } = await admin.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: buildAuthCallbackUrl(origin, { intent: "signin", next: "/partner" }),
        },
      });

      return NextResponse.json({
        ok: true,
        status: "provisioned",
        emailSent: !otpError,
        message: otpError
          ? "Company linked to their existing login. No email was sent (check Supabase Auth email settings). They can sign in manually."
          : "Company linked and a sign-in link was emailed (magic link). They use that or Google sign-in, then open Partner.",
      });
    }

    return NextResponse.json({
      ok: true,
      status: "provisioned",
      message:
        "This email already has a HomeFix login — company linked. They can sign in and open the partner workspace.",
    });
  }

  if (fulfillStatus === "already_provisioned") {
    await admin.from("partner_invitations").delete().eq("id", invitation.id);
    return NextResponse.json(
      {
        error: "This email already belongs to a partner company. Choose Remove partner account under the form to invite them again.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, status: fulfillStatus ?? "unknown" });
}
