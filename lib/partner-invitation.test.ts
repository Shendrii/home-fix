import { describe, expect, it } from "vitest";
import { partnerInvitationStatus } from "@/lib/partner-invitation";

describe("partnerInvitationStatus", () => {
  const base = {
    invited_at: "2026-07-26T12:00:00.000Z",
    revoked_at: null,
    expires_at: "2099-08-09T12:00:00.000Z",
  };

  it("marks instant admin provisioning as company linked", () => {
    const status = partnerInvitationStatus({
      ...base,
      accepted_at: "2026-07-26T12:00:01.000Z",
    });
    expect(status.label).toBe("Company linked");
  });

  it("marks delayed acceptance as signup", () => {
    const status = partnerInvitationStatus({
      ...base,
      accepted_at: "2026-07-26T12:10:00.000Z",
    });
    expect(status.label).toBe("Accepted signup");
  });

  it("marks a cancelled invite as revoked", () => {
    const status = partnerInvitationStatus({
      ...base,
      accepted_at: null,
      revoked_at: "2026-07-27T12:00:00.000Z",
    });
    expect(status.label).toBe("Revoked");
  });

  it("marks an unused invite as expired after the deadline", () => {
    const status = partnerInvitationStatus({
      ...base,
      accepted_at: null,
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    expect(status.label).toBe("Expired");
  });

  it("marks open invites as awaiting signup", () => {
    const status = partnerInvitationStatus({
      ...base,
      accepted_at: null,
    });
    expect(status.label).toBe("Awaiting signup");
    expect(status.hint).toContain("company is created");
  });

  it("treats acceptance at 15 seconds as a completed signup", () => {
    expect(partnerInvitationStatus({
      ...base,
      accepted_at: "2026-07-26T12:00:15.000Z",
    }).label).toBe("Accepted signup");
    expect(partnerInvitationStatus({
      ...base,
      accepted_at: "2026-07-26T12:00:14.999Z",
    }).label).toBe("Company linked");
  });

  it("keeps a cancelled invite revoked even after it was accepted", () => {
    expect(partnerInvitationStatus({
      ...base,
      accepted_at: "2026-07-26T12:00:01.000Z",
      revoked_at: "2026-07-27T12:00:00.000Z",
    }).label).toBe("Revoked");
  });

  it("describes a team invite as joining the existing company", () => {
    const status = partnerInvitationStatus({
      ...base,
      accepted_at: null,
      target_company_id: "company-1",
    });
    expect(status.label).toBe("Awaiting signup");
    expect(status.hint).toBe("Signup email sent. They join this company when they accept.");
  });
});
