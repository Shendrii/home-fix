import { describe, expect, it } from "vitest";
import {
  calendarDays,
  formatPreferredWindow,
  formatStoredPreferredWindow,
  isPreferredWindowValid,
  preferredWindowBounds,
} from "@/lib/preferred-window";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(12, 0, 0, 0);

describe("preferred appointment window", () => {
  it("labels a preset slot with the chosen day", () => {
    const label = formatPreferredWindow({ date: tomorrow, slotId: "morning", customRange: "" });
    expect(label).toContain("9–11 AM");
  });

  it("requires a custom window to say when", () => {
    expect(isPreferredWindowValid({ date: tomorrow, slotId: "custom", customRange: "8" })).toBe(false);
    expect(isPreferredWindowValid({ date: tomorrow, slotId: "custom", customRange: "evening" })).toBe(false);
    expect(isPreferredWindowValid({ date: tomorrow, slotId: "custom", customRange: "8–10 PM" })).toBe(true);
    expect(formatPreferredWindow({ date: tomorrow, slotId: "custom", customRange: "8–10 PM" })).toContain("8–10 PM");
  });

  it("stores morning as 9:00 to 11:00", () => {
    const { startAt, endAt } = preferredWindowBounds({ date: tomorrow, slotId: "morning", customRange: "" });
    expect(new Date(startAt).getHours()).toBe(9);
    expect(new Date(endAt).getHours()).toBe(11);
  });

  it("stores the hours the client typed for a custom window", () => {
    const evening = preferredWindowBounds({ date: tomorrow, slotId: "custom", customRange: "8–10 PM" });
    expect(new Date(evening.startAt).getHours()).toBe(20);
    expect(new Date(evening.endAt).getHours()).toBe(22);

    const afternoon = preferredWindowBounds({ date: tomorrow, slotId: "custom", customRange: "2-4 PM" });
    expect(new Date(afternoon.startAt).getHours()).toBe(14);
    expect(new Date(afternoon.endAt).getHours()).toBe(16);

    const afterSix = preferredWindowBounds({ date: tomorrow, slotId: "custom", customRange: "after 6 PM" });
    expect(new Date(afterSix.startAt).getHours()).toBe(18);
    expect(new Date(afterSix.endAt).getTime() - new Date(afterSix.startAt).getTime()).toBe(3 * 60 * 60 * 1000);
  });

  it("says a job is unscheduled until a start time exists", () => {
    expect(formatStoredPreferredWindow(null, null)).toBe("To be scheduled");
    expect(formatStoredPreferredWindow("not-a-date", null)).toBe("To be scheduled");
  });

  it("pads the calendar so the first day lands on the right weekday", () => {
    const cells = calendarDays(new Date(2026, 9, 1));
    expect(cells[0]).toBeNull();
    expect(cells.find((day) => day?.getDate() === 1)?.getDay()).toBe(4);
  });
});
