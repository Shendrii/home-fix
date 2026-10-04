export const TIME_SLOTS = [
  { id: "morning", label: "9–11 AM", description: "Morning" },
  { id: "midday", label: "11 AM–1 PM", description: "Midday" },
  { id: "afternoon", label: "1–4 PM", description: "Afternoon" },
  { id: "evening", label: "4–7 PM", description: "Evening" },
  { id: "custom", label: "Custom", description: "Your own window" },
] as const;

export type TimeSlotId = (typeof TIME_SLOTS)[number]["id"];

export type PreferredWindowState = {
  date: Date;
  slotId: TimeSlotId;
  customRange: string;
};

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function formatDateLabel(date: Date) {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return target.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function defaultPreferredWindow(): PreferredWindowState {
  return {
    date: addDays(new Date(), 1),
    slotId: "morning",
    customRange: "",
  };
}

/** Human-readable window from persisted service request timestamps. */
export function formatStoredPreferredWindow(
  preferredStartAt?: string | null,
  preferredEndAt?: string | null,
) {
  if (!preferredStartAt) return "To be scheduled";
  const start = new Date(preferredStartAt);
  if (Number.isNaN(start.getTime())) return "To be scheduled";
  const end = preferredEndAt ? new Date(preferredEndAt) : null;
  const time = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const range =
    end && !Number.isNaN(end.getTime()) ? `${time(start)}–${time(end)}` : time(start);
  return `${formatDateLabel(start)}, ${range}`;
}

export function formatPreferredWindow(state: PreferredWindowState) {
  if (state.slotId === "custom") {
    const custom = state.customRange.trim();
    if (!custom) return "";
    return `${formatDateLabel(state.date)}, ${custom}`;
  }
  const slot = TIME_SLOTS.find((item) => item.id === state.slotId);
  return slot ? `${formatDateLabel(state.date)}, ${slot.label}` : "";
}

type ClockParts = { hour: number; minute: number; meridian: "am" | "pm" | null };

const CUSTOM_RANGE =
  /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:–|—|-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;

function readClock(hourText: string, minuteText: string | undefined, meridianText: string | undefined): ClockParts | null {
  const hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;
  const meridian = meridianText ? (meridianText.toLowerCase() as "am" | "pm") : null;
  if (meridian && (hour < 1 || hour > 12)) return null;
  if (!meridian && hour > 23) return null;
  return { hour, minute, meridian };
}

function toMinutes(parts: ClockParts, meridian: "am" | "pm" | null) {
  if (meridian) {
    if (parts.hour < 1 || parts.hour > 12) return null;
    return ((parts.hour % 12) + (meridian === "pm" ? 12 : 0)) * 60 + parts.minute;
  }
  if (parts.hour > 23) return null;
  return parts.hour * 60 + parts.minute;
}

/** Minutes from local midnight. End may pass midnight and can be greater than 24 hours. */
function parseCustomWindow(range: string) {
  const text = range.trim().replace(/\s+/g, " ");
  const single = text.match(/^(after|from|before)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (single) {
    const clock = readClock(single[2], single[3], single[4]);
    if (!clock?.meridian) return null;
    const minutes = toMinutes(clock, clock.meridian);
    if (minutes == null) return null;
    return single[1].toLowerCase() === "before"
      ? { start: minutes - 180, end: minutes }
      : { start: minutes, end: minutes + 180 };
  }

  const match = text.match(CUSTOM_RANGE);
  if (!match) return null;
  const startClock = readClock(match[1], match[2], match[3]);
  const endClock = readClock(match[4], match[5], match[6]);
  if (!startClock || !endClock) return null;

  let startMeridian = startClock.meridian;
  let endMeridian = endClock.meridian;
  if (!startMeridian && !endMeridian) {
    const looks24Hour = startClock.hour === 0 || endClock.hour === 0 || startClock.hour > 12 || endClock.hour > 12;
    if (!looks24Hour) return null;
  } else if (!startMeridian && endMeridian) {
    startMeridian = endMeridian;
  } else if (startMeridian && !endMeridian) {
    const crossesNoon =
      endClock.hour < startClock.hour || (endClock.hour === startClock.hour && endClock.minute <= startClock.minute);
    endMeridian = crossesNoon ? (startMeridian === "am" ? "pm" : "am") : startMeridian;
  }

  const start = toMinutes(startClock, startMeridian);
  let end = toMinutes(endClock, endMeridian);
  if (start == null || end == null) return null;
  if (endClock.hour === 12 && endMeridian === "pm" && start >= 12 * 60 && end <= start) {
    end = 24 * 60;
  }
  if (end <= start) end += 24 * 60;
  return { start, end };
}

export function isPreferredWindowValid(state: PreferredWindowState) {
  if (state.slotId === "custom") return parseCustomWindow(state.customRange) != null;
  return true;
}

function atMinutes(date: Date, minutes: number) {
  const next = startOfDay(date);
  next.setMinutes(minutes);
  return next;
}

/** Converts the picker selection into database timestamps used for dispatch. */
export function preferredWindowBounds(state: PreferredWindowState) {
  const starts: Record<Exclude<TimeSlotId, "custom">, [number, number, number, number]> = {
    morning: [9, 0, 11, 0],
    midday: [11, 0, 13, 0],
    afternoon: [13, 0, 16, 0],
    evening: [16, 0, 19, 0],
  };
  if (state.slotId === "custom") {
    const parsed = parseCustomWindow(state.customRange);
    if (!parsed) throw new Error("Enter a time range such as 2–4 PM.");
    return {
      startAt: atMinutes(state.date, parsed.start).toISOString(),
      endAt: atMinutes(state.date, parsed.end).toISOString(),
    };
  }
  const [startHour, startMinute, endHour, endMinute] = starts[state.slotId];
  const start = new Date(state.date);
  start.setHours(startHour, startMinute, 0, 0);
  const end = new Date(state.date);
  end.setHours(endHour, endMinute, 0, 0);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function calendarDays(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}
