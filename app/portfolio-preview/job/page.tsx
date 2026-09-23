"use client";

import { AppProviderPortfolioHarness } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { JobDetail } from "@/components/screens";
import {
  PORTFOLIO_CLIENT_PROFILE,
  portfolioClientJobContext,
} from "@/lib/portfolio-demo-data";

export default function PortfolioJobPreviewPage() {
  return (
    <AppProviderPortfolioHarness value={portfolioClientJobContext()}>
      <AppShell role="client" profile={PORTFOLIO_CLIENT_PROFILE} navPathname="/jobs/portfolio-job-detail">
        <JobDetail id="portfolio-job-detail" />
      </AppShell>
    </AppProviderPortfolioHarness>
  );
}
