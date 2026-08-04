import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AuthProvider, useAuth } from "@/components/auth-provider";

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  }),
  isSupabaseConfigured: true,
}));

function AuthProbe() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="user-id">{user?.id ?? "none"}</span>
      <span data-testid="profile-role">{profile?.role ?? "none"}</span>
    </div>
  );
}

describe("AuthProvider login state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => resolve({ data: { session: null } }), 0);
      }),
    );
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("sets global auth state after a successful session is established", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "user-1", full_name: "Maya Thompson", role: "client" },
    });

    let authListener: ((event: string, session: { user: { id: string } } | null) => void) | undefined;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authListener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
    authListener?.("SIGNED_IN", { user: { id: "user-1" } });

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-1");
      expect(screen.getByTestId("profile-role")).toHaveTextContent("client");
    });
  });
});
