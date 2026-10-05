"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { calendarDays, isSameDay, startOfDay } from "@/lib/preferred-window";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/screens";
import type { JobRequest } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Read-model calendar over jobs already loaded by AppProvider — no new
 * backend dependency, complements the "scheduled" status with a day-at-a-glance view.
 */
export function PartnerJobsCalendar({ jobs }: { jobs: JobRequest[] }) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(() => today);
  const [selectedDay, setSelectedDay] = useState(() => today);

  const scheduled = useMemo(
    () =>
      jobs.filter(
        (job) => job.preferredStartAt && !["completed", "cancelled"].includes(job.status),
      ),
    [jobs],
  );

  const jobsByDay = useMemo(() => {
    const map = new Map<string, JobRequest[]>();
    for (const job of scheduled) {
      const date = startOfDay(new Date(job.preferredStartAt!));
      const key = date.toDateString();
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    return map;
  }, [scheduled]);

  const monthCells = useMemo(() => calendarDays(viewMonth), [viewMonth]);
  const selectedJobs = jobsByDay.get(selectedDay.toDateString()) ?? [];

  function shiftMonth(delta: number) {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <Card className="border-0 bg-card">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-5" />
            </button>
            <p className="text-sm font-bold text-foreground">
              {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const dayJobs = jobsByDay.get(date.toDateString()) ?? [];
              const selected = isSameDay(date, selectedDay);
              const isToday = isSameDay(date, today);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(startOfDay(date))}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-sm font-semibold transition-colors",
                    !selected && "text-foreground hover:bg-secondary",
                    selected && "bg-primary text-primary-foreground shadow-sm",
                    !selected && isToday && "ring-2 ring-primary/25",
                  )}
                >
                  {date.getDate()}
                  {dayJobs.length > 0 && (
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        selected ? "bg-card" : "bg-primary",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-card">
        <CardContent>
          <p className="mb-4 text-sm font-bold text-foreground">
            {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {selectedJobs.length === 0 && (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No scheduled jobs this day.
            </p>
          )}
          <div className="space-y-3">
            {selectedJobs.map((job) => (
              <Link
                key={job.id}
                href={`/partner/jobs/${job.id}`}
                className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{job.title}</p>
                  <StatusBadge status={job.status} />
                </div>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" /> {job.preferredDate}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" /> {job.address}
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
