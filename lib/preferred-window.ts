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

export function isPreferredWindowValid(state: PreferredWindowState) {
  if (state.slotId === "custom") return state.customRange.trim().length >= 3;
  return true;
}

/** Converts the picker selection into database timestamps used for dispatch. */
export function preferredWindowBounds(state: PreferredWindowState) {
  const starts: Record<Exclude<TimeSlotId, "custom">, [number, number, number, number]> = {
    morning: [9, 0, 11, 0],
    midday: [11, 0, 13, 0],
    afternoon: [13, 0, 16, 0],
    evening: [16, 0, 19, 0],
  };
  const [startHour, startMinute, endHour, endMinute] =
    state.slotId === "custom" ? [9, 0, 17, 0] : starts[state.slotId];
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
