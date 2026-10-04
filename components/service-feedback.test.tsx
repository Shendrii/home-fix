import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviderPortfolioHarness } from "@/components/app-provider";
import { ServiceFeedback } from "@/components/service-feedback";
import { portfolioClientJobContext } from "@/lib/portfolio-demo-data";

const { maybeSingle, rpc } = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
    rpc,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

function renderFeedback() {
  return render(
    <AppProviderPortfolioHarness value={portfolioClientJobContext()}>
      <ServiceFeedback jobId="job-1" companyId="company-1" />
    </AppProviderPortfolioHarness>,
  );
}

describe("service feedback", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    rpc.mockReset();
  });

  it("asks only for the visit, not the client or the service", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    renderFeedback();
    expect(await screen.findByRole("heading", { name: "How was the visit?" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/service/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeDisabled();
  });

  it("sends the rating, recommendation, and optional notes for this job", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    rpc.mockResolvedValue({ error: null });
    renderFeedback();
    await screen.findByRole("heading", { name: "How was the visit?" });
    fireEvent.click(screen.getByRole("button", { name: "4 out of 5" }));
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    fireEvent.change(screen.getByLabelText("What did we do well?"), { target: { value: "On time" } });
    fireEvent.change(screen.getByLabelText("What should we improve?"), { target: { value: "Call ahead" } });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(rpc).toHaveBeenCalledWith("submit_service_feedback", {
      p_request_id: "job-1",
      p_rating: 4,
      p_would_recommend: true,
      p_went_well: "On time",
      p_improve: "Call ahead",
      p_client_id: null,
    });
  });

  it("hides the form after feedback was already saved", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "review-1" } });
    renderFeedback();
    expect(await screen.findByText("Thanks for the note")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send feedback" })).not.toBeInTheDocument();
  });
});
