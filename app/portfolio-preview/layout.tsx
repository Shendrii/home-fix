/** Keeps portfolio app-shell shots to one viewport — no extra scroll beneath the sidebar. */
export default function PortfolioPreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-svh overflow-hidden bg-[#faf8f3]">{children}</div>;
}
