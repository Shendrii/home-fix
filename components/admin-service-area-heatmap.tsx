"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HeatCell = {
  cell_lat: number;
  cell_lng: number;
  request_count: number;
  partner_coverage_count: number;
};

const LOOKBACK_DAYS = 30;

function intensityClass(count: number, max: number) {
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return "bg-orange-600 text-white";
  if (ratio > 0.5) return "bg-orange-400 text-white";
  if (ratio > 0.25) return "bg-orange-200 text-orange-900";
  return "bg-orange-50 text-orange-800";
}

/**
 * v1, deliberately scoped: a static grid over a fixed 30-day lookback, not
 * an open-ended drill-down tool. Read-only aggregation over existing
 * service_requests/companies data — no new schema.
 */
export function AdminServiceAreaHeatmap() {
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("admin_service_area_heatmap", {
        p_lookback_days: LOOKBACK_DAYS,
        p_cell_size_deg: 0.05,
      });
      setCells((data ?? []) as HeatCell[]);
      setLoading(false);
    })();
  }, []);

  const maxCount = useMemo(() => cells.reduce((max, cell) => Math.max(max, cell.request_count), 0), [cells]);
  const underCovered = cells.filter((cell) => cell.partner_coverage_count === 0);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Service area coverage"
        description={`Request volume vs. verified partner reach, last ${LOOKBACK_DAYS} days. Fixed grid, read-only.`}
      />

      {underCovered.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p><span className="font-semibold">{underCovered.length} area{underCovered.length === 1 ? "" : "s"}</span> had requests but no verified partner within reach.</p>
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && !cells.length && (
        <Card className="border-0 bg-card"><CardContent className="py-10 text-center text-sm text-slate-500">No geocoded requests in the last {LOOKBACK_DAYS} days.</CardContent></Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cells.map((cell) => (
          <div
            key={`${cell.cell_lat}-${cell.cell_lng}`}
            className={cn("rounded-2xl p-4 transition-colors", intensityClass(cell.request_count, maxCount))}
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
              <MapPin className="size-3.5" /> {cell.cell_lat.toFixed(2)}, {cell.cell_lng.toFixed(2)}
            </p>
            <p className="mt-2 text-2xl font-bold">{cell.request_count}</p>
            <p className="text-xs opacity-80">request{cell.request_count === 1 ? "" : "s"}</p>
            <Badge
              variant="secondary"
              className={cn("mt-3", cell.partner_coverage_count === 0 && "bg-white/80 text-red-700")}
            >
              {cell.partner_coverage_count} partner{cell.partner_coverage_count === 1 ? "" : "s"} in reach
            </Badge>
          </div>
        ))}
      </div>
    </>
  );
}
