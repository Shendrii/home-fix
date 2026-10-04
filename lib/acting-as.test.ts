import { describe, expect, it } from "vitest";
import {
  actingDisplayName,
  actingPortalMatches,
  canActAsRole,
  parseActingTarget,
  resolveServicesPageVariant,
  serializeActingTarget,
} from "@/lib/acting-as";

const companyTarget = {
  type: "company" as const,
  role: "partner" as const,
  userId: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
};

describe("parseActingTarget", () => {
  it("round-trips a company target", () => {
    expect(parseActingTarget(serializeActingTarget(companyTarget))).toEqual(companyTarget);
  });

  it("round-trips a homeowner target", () => {
    const client = {
      type: "client" as const,
      role: "client" as const,
      userId: "11111111-1111-4111-8111-111111111111",
      companyId: null,
    };
    expect(parseActingTarget(serializeActingTarget(client))).toEqual(client);
  });

  it("round-trips an operations target", () => {
    const admin = {
      type: "admin" as const,
      role: "admin" as const,
      userId: "11111111-1111-4111-8111-111111111111",
      companyId: null,
    };
    expect(parseActingTarget(serializeActingTarget(admin))).toEqual(admin);
  });

  it("rejects a company target that is missing its company", () => {
    expect(parseActingTarget(JSON.stringify({
      type: "company",
      role: "partner",
      userId: "11111111-1111-4111-8111-111111111111",
      companyId: null,
    }))).toBeNull();
  });

  it("rejects a target that is missing ids", () => {
    expect(parseActingTarget(JSON.stringify({ type: "company", role: "partner" }))).toBeNull();
    expect(parseActingTarget("not-json")).toBeNull();
    expect(parseActingTarget(null)).toBeNull();
  });
});

describe("canActAsRole", () => {
  it("allows homeowners, partners, and operations", () => {
    expect(canActAsRole("client")).toBe(true);
    expect(canActAsRole("partner")).toBe(true);
    expect(canActAsRole("admin")).toBe(true);
  });

  it("does not let a superadmin view as another superadmin", () => {
    expect(canActAsRole("superadmin")).toBe(false);
  });
});

describe("actingDisplayName", () => {
  it("uses the person's name", () => {
    expect(actingDisplayName({ full_name: "Shendri Kenneth Yamba", email: "sky@example.com" })).toBe(
      "Shendri Kenneth Yamba",
    );
  });

  it("still names someone whose personal details are pending", () => {
    expect(actingDisplayName({ full_name: "Pending update", email: "sky@example.com" })).toBe("sky@example.com");
    expect(actingDisplayName({ full_name: "", email: "" })).toBe("this user");
  });
});

describe("acting portals", () => {
  it("matches the partner shell only for a company target", () => {
    expect(actingPortalMatches(companyTarget, "partner")).toBe(true);
    expect(actingPortalMatches(companyTarget, "client")).toBe(false);
    expect(actingPortalMatches(null, "partner")).toBe(false);
  });
});

describe("resolveServicesPageVariant", () => {
  const client = { id: "user-1", full_name: "Maya", role: "client" as const };
  const superadmin = { id: "admin-1", full_name: "Sky", role: "superadmin" as const };

  it("keeps signed-in homeowners in the app shell", () => {
    expect(resolveServicesPageVariant(client)).toBe("client-app");
  });

  it("sends a superadmin who is acting as a homeowner into the app shell", () => {
    expect(resolveServicesPageVariant(superadmin, "client")).toBe("client-app");
  });

  it("sends a superadmin who is not acting back to admin", () => {
    expect(resolveServicesPageVariant(superadmin, null)).toBe("admin-only");
    expect(resolveServicesPageVariant(superadmin, "partner")).toBe("admin-only");
  });

  it("keeps guests on the public layout", () => {
    expect(resolveServicesPageVariant(null)).toBe("public");
  });
});
