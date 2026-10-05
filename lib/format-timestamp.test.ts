import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTimestamp } from "@/lib/format-timestamp";

describe("formatRelativeTimestamp", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps an unreadable value as-is", () => {
    expect(formatRelativeTimestamp("yesterday")).toBe("yesterday");
  });

  it("says just now, then minutes, then hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T04:00:00.000Z"));
    expect(formatRelativeTimestamp("2026-10-01T03:59:40.000Z")).toBe("Just now");
    expect(formatRelativeTimestamp("2026-10-01T03:30:00.000Z")).toBe("30 min ago");
    expect(formatRelativeTimestamp("2026-10-01T01:00:00.000Z")).toBe("3 hr ago");
  });

  it("uses a calendar date once a day has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12, 0, 0));
    const label = formatRelativeTimestamp(new Date(2026, 9, 3, 12, 0, 0).toISOString());
    expect(label).not.toMatch(/ago/);
    expect(label).toContain("Oct");
  });
});
