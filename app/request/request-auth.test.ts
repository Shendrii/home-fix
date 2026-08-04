import { describe, expect, it } from "vitest";
import { canAccessClientBooking } from "@/lib/auth-display";

describe("Booking page access for authenticated users", () => {
  it("allows the appointment request flow for signed-in clients", () => {
    expect(
      canAccessClientBooking("user-1", {
        id: "user-1",
        full_name: "Maya",
        role: "client",
      }),
    ).toBe(true);
  });

  it("denies the booking flow when the user is not signed in", () => {
    expect(canAccessClientBooking(null, null)).toBe(false);
  });
});
