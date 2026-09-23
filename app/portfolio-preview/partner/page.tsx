"use client";

import { AppProviderPortfolioHarness } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { PartnerDashboard } from "@/components/screens";
import {
  PORTFOLIO_PARTNER_PROFILE,
  portfolioPartnerAppContext,
} from "@/lib/portfolio-demo-data";

export default function PortfolioPartnerPreviewPage() {
  return (
    <AppProviderPortfolioHarness value={portfolioPartnerAppContext()}>
      <AppShell role="partner" profile={PORTFOLIO_PARTNER_PROFILE} navPathname="/partner">
        <PartnerDashboard />
      </AppShell>
    </AppProviderPortfolioHarness>
  );
}
