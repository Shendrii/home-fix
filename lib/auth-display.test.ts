import { describe, expect, it } from "vitest";
import {
  canAccessClientBooking,
  resolveServicesPageVariant,
  shouldShowPublicSignIn,
} from "@/lib/auth-display";

describe("shouldShowPublicSignIn", () => {
  it("hides sign-in while auth is loading", () => {
    expect(
      shouldShowPublicSignIn({ loading: true, userId: null, profile: null }),
    ).toBe(false);
  });

  it("shows sign-in for unauthenticated users", () => {
    expect(
      shouldShowPublicSignIn({ loading: false, userId: null, profile: null }),
    ).toBe(true);
  });

  it("hides sign-in when a session exists", () => {
    expect(
      shouldShowPublicSignIn({
        loading: false,
        userId: "user-1",
        profile: { id: "user-1", full_name: "Maya", role: "client" },
      }),
    ).toBe(false);
  });
});

describe("resolveServicesPageVariant", () => {
  it("uses the client app shell for authenticated clients", () => {
    expect(
      resolveServicesPageVariant({ id: "user-1", full_name: "Maya", role: "client" }),
    ).toBe("client-app");
  });

  it("uses the public layout for guests", () => {
    expect(resolveServicesPageVariant(null)).toBe("public");
  });

  it("uses the client app shell when a superadmin is acting as a homeowner", () => {
    expect(
      resolveServicesPageVariant({ id: "admin-1", full_name: "Sky", role: "superadmin" }, "client"),
    ).toBe("client-app");
  });

  it("sends a superadmin who is not acting as a homeowner back to admin", () => {
    expect(resolveServicesPageVariant({ id: "admin-1", full_name: "Sky", role: "superadmin" }, null)).toBe(
      "admin-only",
    );
  });
});

describe("canAccessClientBooking", () => {
  it("allows booking for authenticated clients", () => {
    expect(
      canAccessClientBooking("user-1", { id: "user-1", full_name: "Maya", role: "client" }),
    ).toBe(true);
  });

  it("blocks booking without a session", () => {
    expect(canAccessClientBooking(null, null)).toBe(false);
  });
});

describe("auth persistence across booking and services routes", () => {
  const clientProfile = { id: "user-1", full_name: "Maya", role: "client" as const };
  const session = { loading: false, userId: "user-1", profile: clientProfile };

  it("keeps booking access after navigating to services", () => {
    expect(canAccessClientBooking(session.userId, session.profile)).toBe(true);
    expect(resolveServicesPageVariant(session.profile)).toBe("client-app");
    expect(shouldShowPublicSignIn(session)).toBe(false);
  });

  it("shows sign-in on services only after session is cleared", () => {
    const signedOut = { loading: false, userId: null, profile: null };
    expect(shouldShowPublicSignIn(signedOut)).toBe(true);
    expect(resolveServicesPageVariant(null)).toBe("public");
    expect(canAccessClientBooking(null, null)).toBe(false);
  });
});
