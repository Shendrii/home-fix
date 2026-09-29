import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ConfigurationHint } from "@/components/protected-page";
import { AdminPartnerList } from "@/components/admin-partner-list";
import { readActingTarget } from "@/lib/acting-as-server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function PartnerProvisioningPage() {
  if (!isSupabaseConfigured) return <ConfigurationHint />;
  const supabase = await createClient();
  const { data: { user } } = await supabase!.auth.getUser();
  const { data: profile } = await supabase!.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const acting = profile?.role === "superadmin" ? await readActingTarget() : null;
  if (profile?.role !== "superadmin" || acting?.role === "admin") redirect("/unauthorized");
  return (
    <>
      <PageHeader
        eyebrow="Marketplace partners"
        title="Partner companies"
        description="Review partner companies and open a company to see its linked users."
        action={<Button render={<Link href="/admin/partners/invite" />}>Invite partner</Button>}
      />
      <AdminPartnerList />
    </>
  );
}
