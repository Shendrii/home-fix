import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AuthForm, ForgotPasswordForm, ResetPasswordForm } from "@/components/auth-form";

const { createClient, push, refresh } = vi.hoisted(() => ({
  createClient: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient,
  isSupabaseConfigured: true,
}));

const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();
const single = vi.fn();

function authClient() {
  return {
    auth: { signInWithPassword, signInWithOAuth, signUp, resetPasswordForEmail, updateUser },
    from: () => ({
      select: () => ({
        eq: () => ({ single }),
      }),
    }),
  };
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  signInWithPassword.mockReset();
  signInWithOAuth.mockReset();
  signUp.mockReset();
  resetPasswordForEmail.mockReset();
  updateUser.mockReset();
  single.mockReset();
  push.mockReset();
  refresh.mockReset();
  createClient.mockReset();
  createClient.mockReturnValue(authClient());
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
});

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("sign in", () => {
  it("requires an email and a password of at least 6 characters", () => {
    render(<AuthForm mode="sign-in" />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();

    type("Email address", "not-an-email");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();

    type("Email address", "maya@example.com");
    type("Password", "abc");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Password must be at least 6 characters.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("ignores an external return path and keeps a booking return", () => {
    const { unmount } = render(<AuthForm mode="sign-in" returnTo={"/\\evil.example"} />);
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/auth/sign-up");
    expect(screen.queryByText(/continue booking/i)).not.toBeInTheDocument();
    unmount();

    render(<AuthForm mode="sign-in" returnTo="/request?service=cleaning" />);
    expect(screen.getByText(/continue booking your appointment/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/auth/sign-up?next=%2Frequest%3Fservice%3Dcleaning",
    );
  });

  it("sends Google back to this page, not a different configured site", async () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";
    signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
    try {
      render(<AuthForm mode="sign-in" />);
      fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
      await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      }));
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });

  it("explains a Google sign-in that found no account", () => {
    render(<AuthForm mode="sign-in" authError="no_account" />);
    expect(toast.error).toHaveBeenCalledWith("You don’t have an account. Please sign up first.");
  });

  it("signs in and sends a homeowner to the dashboard", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign, origin: "http://localhost:3000" });
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1" }, session: { access_token: "token" } },
      error: null,
    });
    single.mockResolvedValue({
      data: {
        role: "client",
        full_name: "Maya",
        phone: "09170000000",
        default_address: "Santo Tomas",
      },
    });

    render(<AuthForm mode="sign-in" />);
    type("Email address", " maya@example.com ");
    type("Password", "secret1");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({
      email: "maya@example.com",
      password: "secret1",
    }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/dashboard"));
    vi.unstubAllGlobals();
  });
});

describe("sign up", () => {
  it("requires the terms, a strong password, and a matching confirmation", () => {
    render(<AuthForm mode="sign-up" />);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(toast.error).toHaveBeenCalledWith("Accept the Terms and Privacy Policy to continue.");

    fireEvent.click(screen.getByRole("checkbox"));
    type("Email address", "maya@example.com");
    type("Password", "short1");
    type("Confirm password", "short1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Use at least 8 characters with a letter and a number.")).toBeInTheDocument();

    type("Password", "longpass1");
    type("Confirm password", "different1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("asks the person to check their inbox when signup has no session yet", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "user-1" }, session: null }, error: null });
    render(<AuthForm mode="sign-up" />);
    fireEvent.click(screen.getByRole("checkbox"));
    type("Email address", "maya@example.com");
    type("Password", "longpass1");
    type("Confirm password", "longpass1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeInTheDocument();
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "maya@example.com",
      password: "longpass1",
    }));
  });
});

describe("password reset", () => {
  it("does not send a reset link for an invalid email", () => {
    render(<ForgotPasswordForm />);
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    type("Email address", "maya");
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("confirms a reset email without saying whether the account exists", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<ForgotPasswordForm />);
    type("Email address", "maya@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeInTheDocument();
    expect(screen.getByText(/we sent a password reset link/i)).toBeInTheDocument();
  });

  it("refuses a new password that is weak or does not match", () => {
    render(<ResetPasswordForm />);
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(screen.getByText("Use at least 8 characters with a letter and a number.")).toBeInTheDocument();
    type("New password", "longpass1");
    type("Confirm password", "longpass2");
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and returns to sign-in", async () => {
    updateUser.mockResolvedValue({ error: null });
    render(<ResetPasswordForm />);
    type("New password", "longpass1");
    type("Confirm password", "longpass1");
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "longpass1" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/auth/sign-in"));
    expect(toast.success).toHaveBeenCalledWith("Password updated");
    expect(refresh).toHaveBeenCalled();
  });
});
