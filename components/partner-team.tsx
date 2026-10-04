"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { CompanyMemberRole } from "@/lib/types";

function roleLabel(role: CompanyMemberRole) {
  return role === "admin" ? "Admin" : "Staff";
}

export function PartnerTeam() {
  const { companies, companyMembers, companyRole, currentPartnerCompanyId, dataReady, users } = useApp();
  const company = companies.find((item) => item.id === currentPartnerCompanyId);
  const members = companyMembers
    .filter((member) => member.companyId === currentPartnerCompanyId)
    .map((member) => ({ ...member, person: users.find((user) => user.id === member.userId) }))
    .sort((a, b) => Number(b.role === "admin") - Number(a.role === "admin") || (a.person?.name ?? "").localeCompare(b.person?.name ?? ""));

  if (!dataReady) {
    return <Card className="border-0 bg-card"><CardContent className="py-10 text-center text-sm text-slate-500">Loading team…</CardContent></Card>;
  }
  if (!company) {
    return <Card className="border-0 bg-card"><CardContent className="py-12 text-center"><h1 className="text-xl font-bold">Partner profile unavailable</h1></CardContent></Card>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Company team"
        title={company.name}
        description={companyRole === "admin"
          ? "Admins can invite people. Everyone here works the same job queue."
          : "Everyone at this company works the same job queue."}
        action={companyRole === "admin" ? <Button render={<Link href="/partner/team/invite" />}>Invite</Button> : undefined}
      />
      <Card className="border-0 bg-card">
        <CardContent className="px-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-3 font-semibold">Person</th>
                <th className="px-6 py-3 font-semibold">Company role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{member.person?.name ?? "HomeFix user"}</p>
                    <p className="text-slate-500">{member.person?.email || "No email on file"}</p>
                  </td>
                  <td className="px-6 py-4 font-medium">{roleLabel(member.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!members.length && <p className="px-6 py-10 text-center text-sm text-slate-500">No people are on this team yet.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export function PartnerTeamInvite() {
  const { companyRole, companies, currentPartnerCompanyId, dataReady } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyMemberRole>("staff");
  const [sending, setSending] = useState(false);
  const company = companies.find((item) => item.id === currentPartnerCompanyId);

  useEffect(() => {
    if (dataReady && companyRole !== "admin") router.replace("/partner/team");
  }, [companyRole, dataReady, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured.");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("Your session has expired. Sign in again.");

    setSending(true);
    try {
      const response = await fetch("/api/partner/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) {
        toast.error("Couldn’t send invite", { description: payload?.error ?? "Try again." });
        return;
      }
      toast.success("Team invite saved", { description: payload?.message });
      setEmail("");
      router.push("/partner/team");
      router.refresh();
    } catch (error) {
      toast.error("Network error", { description: error instanceof Error ? error.message : "Could not reach the invite API." });
    } finally {
      setSending(false);
    }
  }

  if (!dataReady || companyRole !== "admin") {
    return <Card className="border-0 bg-card"><CardContent className="py-10 text-center text-sm text-slate-500">Loading…</CardContent></Card>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Invite"
        title={`Add someone to ${company?.name ?? "your company"}`}
        description="They join this company only. An existing HomeFix login is attached immediately. A new email gets a signup invite."
        action={<Button variant="outline" render={<Link href="/partner/team" />}>Back to team</Button>}
      />
      <form onSubmit={(event) => void submit(event)} className="max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-semibold" htmlFor="team-email">Email</label>
          <Input id="team-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="team-role">Company role</label>
          <select
            id="team-role"
            value={role}
            onChange={(event) => setRole(event.target.value as CompanyMemberRole)}
            className="mt-2 h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <option value="staff">Staff — works the job queue</option>
            <option value="admin">Admin — invites people and manages the company</option>
          </select>
        </div>
        <Button type="submit" disabled={sending} className="h-11">{sending ? "Sending…" : "Send invite"}</Button>
      </form>
    </>
  );
}
