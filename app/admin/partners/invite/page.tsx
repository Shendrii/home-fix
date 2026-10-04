import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigurationHint } from "@/components/protected-page";
import { PartnerInvitationForm } from "@/components/partner-invitation-form";
import { partnerInvitationStatus } from "@/lib/partner-invitation";
import { readActingTarget } from "@/lib/acting-as-server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function InvitePartnerPage() {
  if (!isSupabaseConfigured) return <ConfigurationHint />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase!.auth.getUser();
  const { data: profile } = await supabase!.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const acting = profile?.role === "superadmin" ? await readActingTarget() : null;
  if (profile?.role !== "superadmin" || acting?.role === "admin") redirect("/unauthorized");

  const [{ data: categories }, { data: invitations }] = await Promise.all([
    supabase!.from("service_categories").select("id, name").eq("is_active", true).order("name"),
    supabase!.from("partner_invitations").select("id, email, company_name, invited_at, accepted_at, revoked_at, expires_at, target_company_id").order("invited_at", { ascending: false }).limit(8),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title="Invite a partner company"
        description="Create the company and invite the person who will run it."
        action={<Button variant="outline" render={<Link href="/admin/partners" />}>Back to partners</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,.75fr)]">
        <PartnerInvitationForm categories={categories ?? []} />
        <Card className="h-fit border-0 bg-card">
          <CardHeader>
            <CardTitle>Recent invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations?.length ? (
              <ul className="divide-y divide-slate-100">
                {invitations.map((invitation) => {
                  const { label, hint } = partnerInvitationStatus(invitation);
                  return (
                    <li key={invitation.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{invitation.company_name}</p>
                          <p className="truncate text-sm text-slate-500">{invitation.email}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{label}</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {hint} · {new Date(invitation.invited_at).toLocaleDateString()}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No invitations yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
