import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }));

vi.mock("@/components/public-site-header", () => ({
  PublicSiteHeader: () => <header>Public</header>,
  PublicSiteFooter: () => <footer>Legal</footer>,
}));

vi.mock("@/components/home-appointment-section", () => ({
  HomeAppointmentSection: () => null,
}));

describe("home", () => {
  it("returns a guest who signs in to book back to the request form", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Sign in to book" })).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Frequest",
    );
  });
});
