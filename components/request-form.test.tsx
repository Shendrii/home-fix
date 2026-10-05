import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AppProviderPortfolioHarness } from "@/components/app-provider";
import { RequestForm } from "@/components/request-form";
import { portfolioClientJobContext } from "@/lib/portfolio-demo-data";
import type { JobRequest } from "@/lib/types";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
  isSupabaseConfigured: true,
}));

afterEach(() => {
  cleanup();
  push.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

function renderForm(options?: { initialService?: string; active?: boolean }) {
  const base = portfolioClientJobContext();
  const categories = options?.active === false
    ? base.categories.map((category) => ({ ...category, active: false }))
    : base.categories;
  const createJob = vi.fn(async () => base.jobs[0] as JobRequest);
  render(
    <AppProviderPortfolioHarness value={{ ...base, categories, createJob }}>
      <RequestForm initialService={options?.initialService} />
    </AppProviderPortfolioHarness>,
  );
  return { createJob };
}

describe("request form", () => {
  it("requires a service before the description step", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "What needs attention?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a service to continue.");
    expect(screen.queryByLabelText("Describe the issue")).not.toBeInTheDocument();
  });

  it("says when no services are available", () => {
    renderForm({ active: false });
    expect(screen.getByText(/no services are available/i)).toBeInTheDocument();
  });

  it("requires a description of at least 10 characters", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /Heating & AC/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Tell us what’s happening" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Describe the issue"), { target: { value: "too short" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Describe the issue in at least 10 characters.");
  });

  it("lets the homeowner mark the visit urgent and then requires an address", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /Heating & AC/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Describe the issue"), {
      target: { value: "The bedroom unit blows warm air." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Urgent/ }));
    expect(screen.getByRole("button", { name: /Urgent/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "When and where?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Confirm the address and a valid time window");
  });

  it("opens the description step when the booking link names a known service", () => {
    renderForm({ initialService: "heating-and-ac" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Describe the issue")).toBeInTheDocument();
  });

  it("does not accept an unknown service from the booking link", () => {
    renderForm({ initialService: "roofing" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a service to continue.");
  });
});
