"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TIME_SLOTS,
  addDays,
  calendarDays,
  formatDateLabel,
  formatPreferredWindow,
  isSameDay,
  isPreferredWindowValid,
  startOfDay,
  type PreferredWindowState,
} from "@/lib/preferred-window";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PreferredWindowPicker({
  value,
  onChange,
}: {
  value: PreferredWindowState;
  onChange: (state: PreferredWindowState) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfDay(value.date));
  const today = startOfDay(new Date());
  const display = formatPreferredWindow(value);
  const valid = isPreferredWindowValid(value);
  const monthCells = useMemo(() => calendarDays(viewMonth), [viewMonth]);

  function selectDate(date: Date) {
    if (startOfDay(date) < today) return;
    onChange({ ...value, date: startOfDay(date) });
  }

  function shiftMonth(delta: number) {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          Selected window
        </div>
        <p className={cn("text-sm font-semibold", valid ? "text-primary" : "text-slate-400")}>
          {display || "Pick a date and time"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="grid size-11 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <p className="text-sm font-bold text-slate-900">
            {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="grid size-11 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            aria-label="Next month"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1">
              {day}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {monthCells.map((date, index) => {
            if (!date) return <span key={`empty-${index}`} />;
            const disabled = startOfDay(date) < today;
            const selected = isSameDay(date, value.date);
            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                onClick={() => selectDate(date)}
                className={cn(
                  "h-11 rounded-xl text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  disabled && "cursor-not-allowed text-slate-300",
                  !disabled && !selected && "text-foreground hover:bg-secondary",
                  selected && "bg-primary text-primary-foreground",
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectDate(today)}
            className="h-11 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => selectDate(addDays(today, 1))}
            className="h-11 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            Tomorrow
          </button>
        </div>
      </div>

      <div>
        <p id="time-window-label" className="mb-2 text-sm font-semibold text-foreground">Time window</p>
        <div role="group" aria-labelledby="time-window-label" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              aria-pressed={value.slotId === slot.id}
              onClick={() => onChange({ ...value, slotId: slot.id })}
              className={cn(
                "min-h-11 rounded-xl border-2 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                value.slotId === slot.id
                  ? "border-primary bg-secondary"
                  : "border-border hover:bg-muted",
              )}
            >
              <span className="block text-sm font-bold text-slate-900">{slot.description}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {slot.id === "custom" ? "Enter your own" : slot.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {value.slotId === "custom" && (
        <div>
          <label htmlFor="custom-window" className="mb-2 block text-sm font-semibold text-slate-800">
            Custom time range for {formatDateLabel(value.date)}
          </label>
          <Input
            id="custom-window"
            name="custom-window"
            autoComplete="off"
            value={value.customRange}
            onChange={(event) => onChange({ ...value, customRange: event.target.value })}
            placeholder="e.g. 2–4 PM or after 6 PM"
            className="h-12 rounded-xl"
          />
          {!valid && value.customRange.trim().length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Use a range like 2–4 PM, or “after 6 PM”.</p>
          )}
        </div>
      )}
    </div>
  );
}
