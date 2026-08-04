import type { DispatchOffer, DispatchPhase } from "@/lib/types";

export function isDispatchOfferActive(offer: Pick<DispatchOffer, "status" | "exclusiveUntil">, now = Date.now()) {
  return ["pending", "viewed"].includes(offer.status) && new Date(offer.exclusiveUntil).getTime() > now;
}

export function dispatchPhaseLabel(phase: DispatchPhase | null | undefined) {
  if (phase === "exclusive_offers") return "Finding a qualified partner";
  if (phase === "broadcast") return "Available to qualified nearby partners";
  if (phase === "assigned") return "Partner confirmed";
  if (phase === "cancelled") return "Request cancelled";
  return "Preparing your request";
}

export function dispatchClaimMessage(status: string) {
  const messages: Record<string, string> = {
    assigned: "Job accepted",
    already_claimed: "Another qualified partner accepted this job.",
    offer_expired: "This priority offer has expired.",
    offline: "Go on duty before accepting a job.",
    not_eligible: "Your company is not eligible for this job.",
  };
  return messages[status] ?? "The request could not be claimed.";
}
