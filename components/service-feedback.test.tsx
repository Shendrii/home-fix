import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
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
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
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

  it("stays closed until both a rating and a recommendation are chosen", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    renderFeedback();
    await screen.findByRole("heading", { name: "How was the visit?" });
    fireEvent.click(screen.getByRole("button", { name: "5 out of 5" }));
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeEnabled();
  });

  it("sends a no recommendation and leaves blank notes empty", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    rpc.mockResolvedValue({ error: null });
    renderFeedback();
    await screen.findByRole("heading", { name: "How was the visit?" });
    fireEvent.click(screen.getByRole("button", { name: "1 out of 5" }));
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    fireEvent.change(screen.getByLabelText("What did we do well?"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(rpc).toHaveBeenCalledWith("submit_service_feedback", expect.objectContaining({
      p_rating: 1,
      p_would_recommend: false,
      p_went_well: null,
      p_improve: null,
    }));
    expect(await screen.findByText("Thanks for the note")).toBeInTheDocument();
  });

  it("keeps the form open when saving fails", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    rpc.mockResolvedValue({ error: { message: "row violates policy" } });
    renderFeedback();
    await screen.findByRole("heading", { name: "How was the visit?" });
    fireEvent.click(screen.getByRole("button", { name: "2 out of 5" }));
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn’t save feedback", { description: "row violates policy" });
    });
    expect(screen.getByRole("heading", { name: "How was the visit?" })).toBeInTheDocument();
  });

  it("renders nothing when the visit has no company yet", () => {
    maybeSingle.mockResolvedValue({ data: null });
    const { container } = render(
      <AppProviderPortfolioHarness value={portfolioClientJobContext()}>
        <ServiceFeedback jobId="job-1" companyId="" />
      </AppProviderPortfolioHarness>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("hides the form after feedback was already saved", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "review-1" } });
    renderFeedback();
    expect(await screen.findByText("Thanks for the note")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send feedback" })).not.toBeInTheDocument();
  });
});
