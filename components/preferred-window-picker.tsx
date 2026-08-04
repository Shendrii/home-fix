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
          <CalendarDays className="size-4 text-teal-700" aria-hidden="true" />
          Selected window
        </div>
        <p className={cn("text-sm font-semibold", valid ? "text-teal-800" : "text-slate-400")}>
          {display || "Pick a date and time"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="text-sm font-bold text-slate-900">
            {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Next month"
          >
            <ChevronRight className="size-5" />
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
                onClick={() => selectDate(date)}
                className={cn(
                  "h-10 rounded-xl text-sm font-semibold transition-colors",
                  disabled && "cursor-not-allowed text-slate-300",
                  !disabled && !selected && "text-slate-700 hover:bg-teal-50",
                  selected && "bg-teal-600 text-white shadow-sm",
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
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => selectDate(addDays(today, 1))}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700"
          >
            Tomorrow
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Time window</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onChange({ ...value, slotId: slot.id })}
              className={cn(
                "rounded-xl border-2 px-3 py-3 text-left transition-colors",
                value.slotId === slot.id
                  ? "border-teal-600 bg-teal-50"
                  : "border-slate-100 hover:border-slate-200",
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
            value={value.customRange}
            onChange={(event) => onChange({ ...value, customRange: event.target.value })}
            placeholder="e.g. 2–4 PM or after 6 PM"
            className="h-12 rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
