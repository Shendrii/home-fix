import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviderPortfolioHarness } from "@/components/app-provider";
import { PartnerTeam, PartnerTeamInvite } from "@/components/partner-team";
import { portfolioPartnerAppContext } from "@/lib/portfolio-demo-data";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

const partner = {
  id: "portfolio-partner",
  name: "Alex Rivera",
  email: "alex@metrofix.pro",
  phone: "+63 917 555 0101",
  role: "partner" as const,
  address: "Malvar, Batangas",
};

describe("partner team", () => {
  it("lets a company admin invite people", () => {
    render(
      <AppProviderPortfolioHarness value={{ ...portfolioPartnerAppContext(), users: [partner] }}>
        <PartnerTeam />
      </AppProviderPortfolioHarness>,
    );
    expect(screen.getByRole("button", { name: "Invite" })).toHaveAttribute("href", "/partner/team/invite");
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows staff the member list without an invite action", () => {
    render(
      <AppProviderPortfolioHarness value={{ ...portfolioPartnerAppContext(), companyRole: "staff", users: [partner] }}>
        <PartnerTeam />
      </AppProviderPortfolioHarness>,
    );
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invite" })).not.toBeInTheDocument();
  });

  it("does not open the invite form for staff", () => {
    render(
      <AppProviderPortfolioHarness value={{ ...portfolioPartnerAppContext(), companyRole: "staff" }}>
        <PartnerTeamInvite />
      </AppProviderPortfolioHarness>,
    );
    expect(screen.queryByRole("button", { name: "Send invite" })).not.toBeInTheDocument();
  });
});
