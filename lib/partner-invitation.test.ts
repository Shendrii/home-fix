import { describe, expect, it } from "vitest";
import { partnerInvitationStatus } from "@/lib/partner-invitation";

describe("partnerInvitationStatus", () => {
  const base = {
    invited_at: "2026-07-26T12:00:00.000Z",
    revoked_at: null,
    expires_at: "2026-08-09T12:00:00.000Z",
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

  it("marks open invites as awaiting signup", () => {
    const status = partnerInvitationStatus({
      ...base,
      accepted_at: null,
    });
    expect(status.label).toBe("Awaiting signup");
  });
});
