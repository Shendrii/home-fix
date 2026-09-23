"use client";

import { AppProviderPortfolioHarness } from "@/components/app-provider";
import { AppShell, PageHeader } from "@/components/app-shell";
import { DEMO_LEADERBOARD, PartnerLeaderboardPodium } from "@/components/admin-partner-leaderboard";
import {
  PORTFOLIO_ADMIN_PROFILE,
  portfolioAdminAppContext,
} from "@/lib/portfolio-demo-data";

/** Public demo view for portfolio screenshots (no admin login). */
export default function LeaderboardPreviewPage() {
  return (
    <AppProviderPortfolioHarness value={portfolioAdminAppContext()}>
      <AppShell role="admin" profile={PORTFOLIO_ADMIN_PROFILE} navPathname="/admin/leaderboard">
        <PageHeader
          eyebrow="Operations"
          title="Partner performance leaderboard"
          description="A live read over dispatch offers and job outcomes."
        />
        <PartnerLeaderboardPodium rows={DEMO_LEADERBOARD} showSort={false} />
      </AppShell>
    </AppProviderPortfolioHarness>
  );
}
