import { DEMO_LEADERBOARD, PartnerLeaderboardPodium } from "@/components/admin-partner-leaderboard";

/** Public demo view for portfolio screenshots (no admin login). */
export default function LeaderboardPreviewPage() {
  return (
    <main className="min-h-dvh bg-[#faf8f3] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <PartnerLeaderboardPodium rows={DEMO_LEADERBOARD} showSort={false} />
      </div>
    </main>
  );
}
