import { describe, expect, it } from "vitest";
import type { ActingTarget } from "@/lib/acting-as";
import { parseTeamInvite, resolveCompanyRole, type CompanyMembership } from "@/lib/company-membership";

const companyA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const companyB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const adminId = "11111111-1111-4111-8111-111111111111";
const staffId = "22222222-2222-4222-8222-222222222222";

const members: CompanyMembership[] = [
  { companyId: companyA, userId: adminId, role: "admin" },
  { companyId: companyA, userId: staffId, role: "staff" },
  { companyId: companyB, userId: "33333333-3333-4333-8333-333333333333", role: "admin" },
];

describe("resolveCompanyRole", () => {
  it("treats the founding member as a company admin", () => {
    expect(resolveCompanyRole(members, {
      sessionUserId: adminId,
      partnerCompanyId: companyA,
      acting: null,
    })).toBe("admin");
  });

  it("treats other people on that company as staff", () => {
    expect(resolveCompanyRole(members, {
      sessionUserId: staffId,
      partnerCompanyId: companyA,
      acting: null,
    })).toBe("staff");
  });

  it("does not grant a role in another company", () => {
    expect(resolveCompanyRole(members, {
      sessionUserId: staffId,
      partnerCompanyId: companyB,
      acting: null,
    })).toBeNull();
  });

  it("follows the person a superadmin is viewing as", () => {
    const acting: ActingTarget = {
      type: "company",
      role: "partner",
      userId: staffId,
      companyId: companyA,
    };
    expect(resolveCompanyRole(members, {
      sessionUserId: "99999999-9999-4999-8999-999999999999",
      partnerCompanyId: companyA,
      acting,
    })).toBe("staff");
  });
});

describe("parseTeamInvite", () => {
  it("accepts an admin or staff invite for one email", () => {
    expect(parseTeamInvite({ email: " Sam@Shop.com ", role: "staff" })).toEqual({
      email: "sam@shop.com",
      role: "staff",
    });
    expect(parseTeamInvite({ email: "sam@shop.com", role: "admin" })?.role).toBe("admin");
  });

  it("refuses a missing role, a platform role, or a bad email", () => {
    expect(parseTeamInvite({ email: "sam@shop.com" })).toBeNull();
    expect(parseTeamInvite({ email: "sam@shop.com", role: "superadmin" })).toBeNull();
    expect(parseTeamInvite({ email: "not-an-email", role: "staff" })).toBeNull();
    expect(parseTeamInvite(null)).toBeNull();
  });
});
