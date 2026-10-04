import { describe, expect, it } from "vitest";
import {
  authPathWithReturn,
  bookingPath,
  isClientBookingPath,
  postAuthDestination,
  roleHome,
  safeReturnTo,
} from "@/lib/auth-return";

const client = {
  role: "client" as const,
  full_name: "Maya",
  phone: "09170000000",
  default_address: "Santo Tomas",
};

describe("safeReturnTo", () => {
  it("keeps in-app paths", () => {
    expect(safeReturnTo("/partner/team")).toBe("/partner/team");
    expect(safeReturnTo("/request?service=cleaning")).toBe("/request?service=cleaning");
  });

  it("drops external and auth redirects", () => {
    expect(safeReturnTo("https://evil.example")).toBeNull();
    expect(safeReturnTo("//evil.example")).toBeNull();
    expect(safeReturnTo("/auth/sign-in")).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
  });
});

describe("postAuthDestination", () => {
  it("sends each role to its home", () => {
    expect(roleHome("partner")).toBe("/partner");
    expect(roleHome("admin")).toBe("/admin");
    expect(roleHome("superadmin")).toBe("/admin");
    expect(roleHome("client")).toBe("/dashboard");
  });

  it("holds an incomplete homeowner on account setup", () => {
    expect(postAuthDestination({
      role: "client",
      full_name: "Maya",
      phone: "Pending update",
      default_address: "Pending update",
    }, "/dashboard")).toBe("/account");
  });

  it("returns a homeowner to the page they were booking", () => {
    expect(postAuthDestination(client, "/request?service=cleaning")).toBe("/request?service=cleaning");
  });

  it("does not send a partner into the homeowner app", () => {
    expect(postAuthDestination({ ...client, role: "partner" }, "/dashboard")).toBe("/partner");
    expect(postAuthDestination({ ...client, role: "partner" }, "/partner/jobs")).toBe("/partner/jobs");
  });

  it("keeps operations inside the admin workspace", () => {
    expect(postAuthDestination({ ...client, role: "superadmin" }, "/admin/partners")).toBe("/admin/partners");
    expect(postAuthDestination({ ...client, role: "admin" }, "/partner")).toBe("/admin");
  });
});

describe("booking paths", () => {
  it("builds a request link with an optional service", () => {
    expect(bookingPath()).toBe("/request");
    expect(bookingPath("Heating & AC")).toBe("/request?service=Heating%20%26%20AC");
    expect(isClientBookingPath("/request?service=cleaning")).toBe(true);
    expect(isClientBookingPath("/dashboard")).toBe(false);
  });

  it("appends a safe return path to sign-in", () => {
    expect(authPathWithReturn("/auth/sign-in", "/request")).toBe("/auth/sign-in?next=%2Frequest");
    expect(authPathWithReturn("/auth/sign-up", "https://evil.example")).toBe("/auth/sign-up");
  });
});
