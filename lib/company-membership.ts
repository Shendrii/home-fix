import type { ActingTarget } from "@/lib/acting-as";
import type { CompanyMemberRole } from "@/lib/types";

export type CompanyMembership = {
  companyId: string;
  userId: string;
  role: CompanyMemberRole;
};

/** Company role for the signed-in partner, or for the person a superadmin is viewing as. */
export function resolveCompanyRole(
  members: CompanyMembership[],
  input: {
    sessionUserId: string | null;
    partnerCompanyId: string | null;
    acting: ActingTarget | null;
  },
): CompanyMemberRole | null {
  const subjectId = input.acting?.role === "partner" ? input.acting.userId : input.sessionUserId;
  if (!subjectId || !input.partnerCompanyId) return null;
  return members.find((member) => member.userId === subjectId && member.companyId === input.partnerCompanyId)?.role ?? null;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Team invite accepts only Admin or Staff, and only for this company. */
export function parseTeamInvite(body: { email?: string; role?: string } | null): { email: string; role: CompanyMemberRole } | null {
  const email = body?.email?.trim().toLowerCase() ?? "";
  const role = body?.role === "admin" || body?.role === "staff" ? body.role : null;
  if (!emailPattern.test(email) || !role) return null;
  return { email, role };
}
