"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { ViewAsButton } from "@/components/view-as-controls";
import { PageHeader } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { roleLabel } from "@/lib/profile";
import type { CompanyMemberRole } from "@/lib/types";

export function AdminCompanyDetail({ companyId }: { companyId: string }) {
  const { companies, categories, users, dataReady, companyMembers } = useApp();
  const { profile } = useAuth();
  const company = companies.find((item) => item.id === companyId);
  const isSuperadmin = profile?.role === "superadmin";

  if (!dataReady) {
    return <Card className="border-0 bg-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading company…</CardContent></Card>;
  }
  if (!company) {
    return (
      <Card className="border-0 bg-card">
        <CardContent className="py-10">
          <h1 className="text-xl font-bold">Company not found</h1>
          <Button render={<Link href="/admin/partners" />} className="mt-4">Back to partners</Button>
        </CardContent>
      </Card>
    );
  }

  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "Service";
  const companyRoleLabel = (role: CompanyMemberRole) => (role === "admin" ? "Company admin" : "Staff");
  const members = companyMembers
    .filter((member) => member.companyId === company.id)
    .map((member) => ({ member, person: users.find((user) => user.id === member.userId) }))
    .filter((row) => row.person)
    .sort((a, b) => Number(b.member.role === "admin") - Number(a.member.role === "admin"));

  return (
    <>
      <PageHeader
        eyebrow="Service company"
        title={company.name}
        description="People linked to this company, and the workspace you can enter as a superadmin."
        action={<Button variant="outline" render={<Link href="/admin/partners" />}>All partners</Button>}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className={company.verified ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}>
          {company.verified ? "Verified" : "Review needed"}
        </Badge>
        <span className="text-sm text-muted-foreground">{company.isAvailable ? "On duty" : "Off duty"}</span>
        {company.services.map((service) => (
          <Badge key={service} variant="secondary">{categoryName(service)}</Badge>
        ))}
      </div>
      {isSuperadmin && (
        <div className="mb-6">
          <ViewAsButton companyId={company.id} label="View as company" />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {members.map(({ member, person }) => (
          <Card key={member.userId} className="border-0 bg-card">
            <CardContent>
              <p className="font-bold">{person?.name}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{person?.email || "No email on file"}</p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{companyRoleLabel(member.role)}</Badge>
                  {person && <Badge variant="outline">{roleLabel(person.role)}</Badge>}
                </div>
                {isSuperadmin && person && (person.role === "client" || person.role === "partner") && (
                  <ViewAsButton userId={person.id} label="View as this user" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!members.length && (
          <Card className="border-0 bg-card md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">No people are linked to this company yet.</CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
