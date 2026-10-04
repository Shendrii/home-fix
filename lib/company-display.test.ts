import { describe, expect, it } from "vitest";
import { formatOperatingHours } from "@/lib/company-display";

describe("formatOperatingHours", () => {
  it("returns nothing for empty hours", () => {
    expect(formatOperatingHours(null)).toBeNull();
    expect(formatOperatingHours("  ")).toBeNull();
    expect(formatOperatingHours({})).toBeNull();
  });

  it("uses a summary when the company stored one", () => {
    expect(formatOperatingHours({ summary: " Mon–Fri 8–5 " })).toBe("Mon–Fri 8–5");
  });

  it("lists day slots when there is no summary", () => {
    expect(formatOperatingHours({ mon: "8–5", tue: "8–5" })).toBe("mon: 8–5 · tue: 8–5");
  });
});
