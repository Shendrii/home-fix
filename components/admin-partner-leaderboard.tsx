"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Star, Trophy } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type LeaderboardRow = {
  company_id: string;
  company_name: string;
  verification_status: string;
  is_available: boolean;
  offers_received: number;
  offers_accepted: number;
  offers_declined: number;
  offers_expired: number;
  completed_jobs: number;
  cancelled_after_assignment: number;
  completion_rate: number | null;
  avg_response_seconds: number | null;
  average_rating: number;
  review_count: number;
};

type SortKey = "completion_rate" | "completed_jobs" | "avg_response_seconds" | "average_rating";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "completion_rate", label: "Completion rate" },
  { id: "completed_jobs", label: "Jobs completed" },
  { id: "avg_response_seconds", label: "Response time" },
  { id: "average_rating", label: "Rating" },
];

/**
 * Completion rate here is completed / (completed + cancelled after
 * assignment) — i.e. out of jobs the partner actually took on, not out of
 * every offer ever sent to them (a much easier number to game). Response
 * time is measured from when an offer was created, not when it was viewed.
 */
export function AdminPartnerLeaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("completion_rate");

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("admin_partner_leaderboard");
      setRows((data ?? []) as LeaderboardRow[]);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === "avg_response_seconds") {
        return (a.avg_response_seconds ?? Infinity) - (b.avg_response_seconds ?? Infinity);
      }
      return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
    });
  }, [rows, sortKey]);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Partner performance leaderboard"
        description="A live read over dispatch offers and job outcomes — not a cached snapshot."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ArrowDownUp className="size-4 text-slate-400" />
        {SORTS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSortKey(option.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              sortKey === option.id ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && !sorted.length && (
        <Card className="border-0 bg-white"><CardContent className="py-10 text-center text-sm text-slate-500">No partner activity yet.</CardContent></Card>
      )}

      <div className="space-y-3">
        {sorted.map((row, index) => (
          <Card key={row.company_id} className="border-0 bg-white">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-teal-50 font-bold text-teal-700">
                  {index === 0 ? <Trophy className="size-4" /> : `#${index + 1}`}
                </span>
                <div>
                  <p className="font-bold text-slate-900">{row.company_name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {row.average_rating} · {row.review_count} reviews
                    {!row.is_available && <Badge variant="secondary" className="ml-2">Off duty</Badge>}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                <div><p className="text-xs text-slate-400">Completion rate</p><p className="font-semibold">{row.completion_rate != null ? `${Math.round(row.completion_rate * 100)}%` : "—"}</p></div>
                <div><p className="text-xs text-slate-400">Jobs completed</p><p className="font-semibold">{row.completed_jobs}</p></div>
                <div><p className="text-xs text-slate-400">Avg. response</p><p className="font-semibold">{row.avg_response_seconds != null ? `${Math.round(row.avg_response_seconds)}s` : "—"}</p></div>
                <div><p className="text-xs text-slate-400">Offers declined</p><p className="font-semibold">{row.offers_declined} / {row.offers_received}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
