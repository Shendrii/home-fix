import { describe, expect, it } from "vitest";
import { dispatchClaimMessage, dispatchPhaseLabel, isDispatchOfferActive } from "@/lib/dispatch";

describe("hybrid dispatch helpers", () => {
  const now = Date.parse("2026-07-26T12:00:00.000Z");

  it("recognizes only unexpired actionable offers", () => {
    expect(isDispatchOfferActive({ status: "pending", exclusiveUntil: "2026-07-26T12:00:45.000Z" }, now)).toBe(true);
    expect(isDispatchOfferActive({ status: "declined", exclusiveUntil: "2026-07-26T12:00:45.000Z" }, now)).toBe(false);
    expect(isDispatchOfferActive({ status: "viewed", exclusiveUntil: "2026-07-26T11:59:59.000Z" }, now)).toBe(false);
  });

  it("uses client-safe match status copy", () => {
    expect(dispatchPhaseLabel("exclusive_offers")).toBe("Finding a qualified partner");
    expect(dispatchPhaseLabel("broadcast")).toBe("Available to qualified nearby partners");
    expect(dispatchPhaseLabel("assigned")).toBe("Partner confirmed");
    expect(dispatchPhaseLabel("qualifying")).toBe("Preparing your request");
    expect(dispatchPhaseLabel("cancelled")).toBe("Request cancelled");
  });

  it("maps transactional claim outcomes to actionable messages", () => {
    expect(dispatchClaimMessage("offer_expired")).toBe("This priority offer has expired.");
    expect(dispatchClaimMessage("already_claimed")).toContain("Another qualified partner");
  });
});
