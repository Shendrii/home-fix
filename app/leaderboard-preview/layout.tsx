/** Keeps portfolio app-shell shots to one viewport — no extra scroll beneath the sidebar. */
export default function LeaderboardPreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-svh overflow-hidden bg-background">{children}</div>;
}
