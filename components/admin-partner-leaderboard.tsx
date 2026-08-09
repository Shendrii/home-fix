"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Star } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

/** Demo podium unless `NEXT_PUBLIC_LEADERBOARD_DEMO=false` or live-only prop. */
function isLeaderboardDemoMode(options?: { forceDemo?: boolean; forceLive?: boolean }) {
  if (options?.forceLive) return false;
  if (options?.forceDemo) return true;
  if (process.env.NEXT_PUBLIC_LEADERBOARD_DEMO === "false") return false;
  return true;
}

function sortLeaderboardRows(rows: LeaderboardRow[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    if (sortKey === "avg_response_seconds") {
      return (a.avg_response_seconds ?? Infinity) - (b.avg_response_seconds ?? Infinity);
    }
    return (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
  });
}

export const DEMO_LEADERBOARD: LeaderboardRow[] = [
  {
    company_id: "demo-1",
    company_name: "MetroFix Pro",
    verification_status: "verified",
    is_available: true,
    offers_received: 142,
    offers_accepted: 98,
    offers_declined: 28,
    offers_expired: 16,
    completed_jobs: 87,
    cancelled_after_assignment: 3,
    completion_rate: 0.97,
    avg_response_seconds: 42,
    average_rating: 4.9,
    review_count: 156,
  },
  {
    company_id: "demo-2",
    company_name: "Bayanihan Home Services",
    verification_status: "verified",
    is_available: true,
    offers_received: 118,
    offers_accepted: 81,
    offers_declined: 22,
    offers_expired: 15,
    completed_jobs: 72,
    cancelled_after_assignment: 5,
    completion_rate: 0.93,
    avg_response_seconds: 58,
    average_rating: 4.8,
    review_count: 124,
  },
  {
    company_id: "demo-3",
    company_name: "QuickPipe Luzon",
    verification_status: "verified",
    is_available: false,
    offers_received: 96,
    offers_accepted: 64,
    offers_declined: 18,
    offers_expired: 14,
    completed_jobs: 58,
    cancelled_after_assignment: 4,
    completion_rate: 0.91,
    avg_response_seconds: 71,
    average_rating: 4.7,
    review_count: 89,
  },
  {
    company_id: "demo-4",
    company_name: "CoolAir Batangas",
    verification_status: "verified",
    is_available: true,
    offers_received: 88,
    offers_accepted: 52,
    offers_declined: 24,
    offers_expired: 12,
    completed_jobs: 45,
    cancelled_after_assignment: 6,
    completion_rate: 0.88,
    avg_response_seconds: 95,
    average_rating: 4.6,
    review_count: 67,
  },
  {
    company_id: "demo-5",
    company_name: "SparkLine Electric",
    verification_status: "verified",
    is_available: true,
    offers_received: 76,
    offers_accepted: 48,
    offers_declined: 15,
    offers_expired: 13,
    completed_jobs: 41,
    cancelled_after_assignment: 4,
    completion_rate: 0.89,
    avg_response_seconds: 88,
    average_rating: 4.5,
    review_count: 52,
  },
  {
    company_id: "demo-6",
    company_name: "CleanNest Manila",
    verification_status: "verified",
    is_available: true,
    offers_received: 64,
    offers_accepted: 39,
    offers_declined: 12,
    offers_expired: 13,
    completed_jobs: 34,
    cancelled_after_assignment: 3,
    completion_rate: 0.92,
    avg_response_seconds: 102,
    average_rating: 4.4,
    review_count: 41,
  },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "completion_rate", label: "Completion rate" },
  { id: "completed_jobs", label: "Jobs completed" },
  { id: "avg_response_seconds", label: "Response time" },
  { id: "average_rating", label: "Rating" },
];

function companyInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Big portfolio-style score derived from real metrics. */
function performanceScore(row: LeaderboardRow) {
  return Math.round(
    row.completed_jobs * 1_850 +
      (row.completion_rate ?? 0) * 42_000 +
      row.average_rating * 9_200,
  );
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < full ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
    </div>
  );
}

/** Top-three emphasis via ring weight and neutral medal tints — aligned with admin teal/slate UI. */
const PODIUM_RING = {
  1: "ring-2 ring-teal-600 ring-offset-2 ring-offset-white",
  2: "ring-2 ring-slate-300 ring-offset-2 ring-offset-white",
  3: "ring-2 ring-amber-600/40 ring-offset-2 ring-offset-white",
} as const;

const MEDAL = {
  1: { label: "1st", className: "border border-teal-200 bg-teal-50 text-teal-800" },
  2: { label: "2nd", className: "border border-slate-200 bg-slate-100 text-slate-700" },
  3: { label: "3rd", className: "border border-amber-200/80 bg-amber-50 text-amber-900" },
} as const;

function PodiumAvatar({
  row,
  rank,
  size = "md",
}: {
  row: LeaderboardRow;
  rank: 1 | 2 | 3;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "size-24 sm:size-28" : "size-20 sm:size-24";
  const medal = MEDAL[rank];
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative grid place-items-center rounded-full bg-teal-600 font-bold text-white shadow-sm",
          dim,
          PODIUM_RING[rank],
        )}
      >
        <span className={size === "lg" ? "text-2xl" : "text-lg"}>{companyInitials(row.company_name)}</span>
      </div>
      <span
        className={cn(
          "mt-2 grid size-8 place-items-center rounded-full text-[10px] font-bold uppercase tracking-wide",
          medal.className,
        )}
      >
        {medal.label}
      </span>
      <p className="mt-2 max-w-[7.5rem] text-center text-sm font-bold leading-tight text-slate-900 sm:max-w-[9rem] sm:text-base">
        {row.company_name}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
        {performanceScore(row).toLocaleString()}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Performance score</p>
      <div className="mt-1">
        <StarRow rating={row.average_rating} />
      </div>
    </div>
  );
}

function LeaderboardListRow({ row, rank }: { row: LeaderboardRow; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 sm:gap-4 sm:px-4">
      <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-400">{rank}</span>
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
        {companyInitials(row.company_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{row.company_name}</p>
        <StarRow rating={row.average_rating} />
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-slate-800 sm:text-base">
        {performanceScore(row).toLocaleString()}
      </p>
    </div>
  );
}

export function PartnerLeaderboardPodium({
  rows,
  showSort = true,
}: {
  rows: LeaderboardRow[];
  showSort?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("completed_jobs");
  const sorted = useMemo(() => sortLeaderboardRows(rows, sortKey), [rows, sortKey]);
  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const podiumOrder: [LeaderboardRow | undefined, LeaderboardRow | undefined, LeaderboardRow | undefined] = [
    topThree[1],
    topThree[0],
    topThree[2],
  ];

  if (sorted.length < 3) {
    return (
      <p className="text-sm text-slate-500">Need at least three partners for the podium view.</p>
    );
  }

  return (
    <>
      {showSort && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ArrowDownUp className="size-4 text-slate-400" />
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSortKey(option.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                sortKey === option.id
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : "border-slate-200 text-slate-600 hover:border-slate-300",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white px-4 pb-8 pt-6 shadow-[0_16px_50px_rgba(30,41,59,.07)] sm:px-8 sm:pb-10 sm:pt-8">
        <div className="mb-8 border-b border-slate-100 pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Top partners</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Leaderboard</h2>
        </div>

        <div className="mx-auto flex max-w-2xl items-end justify-center gap-2 sm:gap-6">
          {podiumOrder[0] && (
            <div className="mb-4 flex flex-1 justify-center pb-2 sm:mb-6">
              <PodiumAvatar row={podiumOrder[0]} rank={2} />
            </div>
          )}
          {podiumOrder[1] && (
            <div className="flex flex-1 justify-center">
              <PodiumAvatar row={podiumOrder[1]} rank={1} size="lg" />
            </div>
          )}
          {podiumOrder[2] && (
            <div className="mb-2 flex flex-1 justify-center pb-4 sm:mb-5">
              <PodiumAvatar row={podiumOrder[2]} rank={3} />
            </div>
          )}
        </div>

        {rest.length > 0 && (
          <div className="mx-auto mt-8 max-w-xl space-y-2 border-t border-slate-100 pt-6">
            {rest.map((row, i) => (
              <LeaderboardListRow key={row.company_id} row={row} rank={i + 4} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function AdminPartnerLeaderboard({
  forceDemo = false,
  forceLive = false,
}: {
  forceDemo?: boolean;
  forceLive?: boolean;
}) {
  const demoMode = isLeaderboardDemoMode({ forceDemo, forceLive });
  const [rows, setRows] = useState<LeaderboardRow[]>(() => (demoMode ? DEMO_LEADERBOARD : []));
  const [loading, setLoading] = useState(() => !demoMode);

  useEffect(() => {
    if (demoMode) {
      setRows(DEMO_LEADERBOARD);
      setLoading(false);
      return;
    }
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("admin_partner_leaderboard");
      const live = (data ?? []) as LeaderboardRow[];
      setRows(live.length >= 3 ? live : DEMO_LEADERBOARD);
      setLoading(false);
    })();
  }, [demoMode]);

  const displayRows = rows.length >= 3 ? rows : DEMO_LEADERBOARD;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Partner performance leaderboard"
        description={
 "A live read over dispatch offers and job outcomes."
        }
      />

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && <PartnerLeaderboardPodium rows={displayRows} />}
    </>
  );
}
