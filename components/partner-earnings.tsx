"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Clock3, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EarningsRow = {
  service_request_id: string;
  reference_code: string | null;
  title: string;
  completed_at: string;
  accepted_at: string;
  hours_worked: number | null;
  final_price_cents: number | null;
};

type Bucket = { label: string; jobs: number; hours: number; amountCents: number };

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function bucketRows(rows: EarningsRow[], granularity: "day" | "week" | "month") {
  const map = new Map<string, Bucket>();
  for (const row of rows) {
    const date = new Date(row.completed_at);
    let key: string;
    let label: string;
    if (granularity === "day") {
      key = date.toDateString();
      label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (granularity === "week") {
      const weekStart = startOfWeek(date);
      key = weekStart.toDateString();
      label = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else {
      key = `${date.getFullYear()}-${date.getMonth()}`;
      label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    const existing = map.get(key) ?? { label, jobs: 0, hours: 0, amountCents: 0 };
    existing.jobs += 1;
    existing.hours += row.hours_worked ?? 0;
    existing.amountCents += row.final_price_cents ?? 0;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, bucket]) => bucket);
}

/**
 * "Estimated activity," not "Earnings" — there is no payments/settlement
 * step yet. This reads `final_price_cents`, which defaults to the
 * pre-work estimate at completion, so the number shown here is always an
 * estimate until real payments exist.
 */
export function PartnerEarnings() {
  const { actingAs } = useApp();
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("partner_job_earnings", {
        p_company_id: actingAs?.role === "partner" ? actingAs.companyId : null,
      });
      setRows((data ?? []) as EarningsRow[]);
      setLoading(false);
    })();
  }, [actingAs]);

  const buckets = useMemo(() => bucketRows(rows, granularity), [rows, granularity]);
  const totalJobs = rows.length;
  const totalHours = rows.reduce((sum, row) => sum + (row.hours_worked ?? 0), 0);
  const totalAmountCents = rows.reduce((sum, row) => sum + (row.final_price_cents ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Field work"
        title="Estimated activity"
        description="A directional view of completed jobs, hours, and value — not a settlement or payout."
      />
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        These figures are estimates based on job pricing at completion. HomeFix does not yet process payments, so
        nothing here has been settled or paid out.
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-0 bg-card"><CardContent><p className="text-xs font-medium text-muted-foreground">Jobs completed</p><p className="mt-2 text-2xl font-bold">{totalJobs}</p></CardContent></Card>
        <Card className="border-0 bg-card"><CardContent><p className="text-xs font-medium text-muted-foreground">Hours worked (est.)</p><p className="mt-2 text-2xl font-bold">{totalHours.toFixed(1)}</p></CardContent></Card>
        <Card className="border-0 bg-card"><CardContent><p className="text-xs font-medium text-muted-foreground">Estimated value</p><p className="mt-2 text-2xl font-bold">${(totalAmountCents / 100).toFixed(0)}</p></CardContent></Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarRange className="size-4 text-primary" /> Breakdown
        </p>
        <div className="flex h-9 items-center gap-1 rounded-xl border bg-card p-1">
          {(["day", "week", "month"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setGranularity(option)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                granularity === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-0 bg-card">
        <CardHeader><CardTitle>By {granularity}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && !buckets.length && (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              No completed jobs yet. Estimated activity appears here once jobs are marked complete.
            </p>
          )}
          {buckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{bucket.label}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><TrendingUp className="size-3.5" /> {bucket.jobs} jobs</span>
                  <span className="flex items-center gap-1"><Clock3 className="size-3.5" /> {bucket.hours.toFixed(1)} hrs</span>
                </p>
              </div>
              <Badge variant="secondary" className="text-sm">${(bucket.amountCents / 100).toFixed(0)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
