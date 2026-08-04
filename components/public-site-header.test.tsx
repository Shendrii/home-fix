import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { AuthProviderTestHarness, type AuthContextValue } from "@/components/auth-provider";
import { PublicSiteHeader } from "@/components/public-site-header";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

function renderHeader(auth: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    user: auth.user ?? null,
    profile: auth.profile ?? null,
    loading: auth.loading ?? false,
    refresh: async () => {},
    signOut: async () => {},
  };

  return render(
    <AuthProviderTestHarness value={value}>
      <PublicSiteHeader />
    </AuthProviderTestHarness>,
  );
}

describe("PublicSiteHeader auth UI", () => {
  it("shows sign-in for unauthenticated users on the services layout", () => {
    renderHeader({ loading: false, user: null, profile: null });
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My dashboard" })).not.toBeInTheDocument();
  });

  it("hides sign-in for authenticated clients on the services layout", () => {
    renderHeader({
      loading: false,
      user: { id: "user-1" } as AuthContextValue["user"],
      profile: { id: "user-1", full_name: "Maya", role: "client" },
    });
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});

describe("Authenticated booking vs services navigation", () => {
  it("treats booking and services as authenticated for the same client session", () => {
    const session = {
      loading: false,
      user: { id: "user-1" } as AuthContextValue["user"],
      profile: { id: "user-1", full_name: "Maya", role: "client" as const },
    };

    const { unmount } = renderHeader(session);
    expect(screen.getAllByRole("link", { name: "My dashboard" })).toHaveLength(1);
    unmount();

    renderHeader(session);
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Services" })).toBeInTheDocument();
  });
});
