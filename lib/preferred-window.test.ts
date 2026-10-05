import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarDays,
  defaultPreferredWindow,
  formatDateLabel,
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

  it("starts a Sunday month on the first cell", () => {
    const cells = calendarDays(new Date(2026, 1, 1));
    expect(cells[0]?.getDate()).toBe(1);
    expect(cells.filter(Boolean)).toHaveLength(28);
  });

  it("labels today and tomorrow, and defaults to tomorrow morning", () => {
    const today = new Date();
    today.setHours(15, 30, 0, 0);
    expect(formatDateLabel(today)).toBe("Today");
    expect(formatDateLabel(addDays(today, 1))).toBe("Tomorrow");
    const fallback = defaultPreferredWindow();
    expect(fallback.slotId).toBe("morning");
    expect(formatDateLabel(fallback.date)).toBe("Tomorrow");
  });

  it("stores each preset window on the chosen day", () => {
    const cases = [
      ["midday", 11, 13],
      ["afternoon", 13, 16],
      ["evening", 16, 19],
    ] as const;
    for (const [slotId, startHour, endHour] of cases) {
      expect(isPreferredWindowValid({ date: tomorrow, slotId, customRange: "" })).toBe(true);
      const bounds = preferredWindowBounds({ date: tomorrow, slotId, customRange: "" });
      expect(new Date(bounds.startAt).getHours()).toBe(startHour);
      expect(new Date(bounds.endAt).getHours()).toBe(endHour);
    }
  });

  it("stores a before-window and an overnight custom range", () => {
    const beforeSix = preferredWindowBounds({ date: tomorrow, slotId: "custom", customRange: "before 6 PM" });
    expect(new Date(beforeSix.endAt).getHours()).toBe(18);
    expect(new Date(beforeSix.endAt).getTime() - new Date(beforeSix.startAt).getTime()).toBe(3 * 60 * 60 * 1000);

    const overnight = preferredWindowBounds({ date: tomorrow, slotId: "custom", customRange: "10 PM – 1 AM" });
    expect(new Date(overnight.startAt).getHours()).toBe(22);
    expect(new Date(overnight.endAt).getHours()).toBe(1);
    expect(new Date(overnight.endAt).getTime()).toBeGreaterThan(new Date(overnight.startAt).getTime());
  });

  it("refuses to store a custom window that does not parse", () => {
    expect(formatPreferredWindow({ date: tomorrow, slotId: "custom", customRange: "   " })).toBe("");
    expect(() => preferredWindowBounds({ date: tomorrow, slotId: "custom", customRange: "evening" })).toThrow(
      /time range/i,
    );
  });

  it("formats a saved visit window and ignores a broken end time", () => {
    const start = new Date(2026, 9, 8, 9, 0, 0);
    const end = new Date(2026, 9, 8, 11, 0, 0);
    const label = formatStoredPreferredWindow(start.toISOString(), end.toISOString());
    expect(label).toContain("9:00");
    expect(label).toContain("11:00");
    expect(formatStoredPreferredWindow(start.toISOString(), "not-a-date")).not.toContain("–");
  });
});
