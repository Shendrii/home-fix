import { AdminPartnerLeaderboard } from "@/components/admin-partner-leaderboard";

export default async function AdminLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; live?: string }>;
}) {
  const { demo, live } = await searchParams;
  return (
    <AdminPartnerLeaderboard forceDemo={demo === "1"} forceLive={live === "1"} />
  );
}
