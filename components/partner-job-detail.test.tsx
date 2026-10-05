import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AppProviderPortfolioHarness } from "@/components/app-provider";
import { PartnerJobDetail } from "@/components/partner-job-detail";
import { portfolioPartnerAppContext } from "@/lib/portfolio-demo-data";
import type { JobRequest, JobStatus } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
  isSupabaseConfigured: false,
}));

afterEach(() => {
  cleanup();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
});

const scheduledJob: JobRequest = {
  id: "job-scheduled",
  userId: "portfolio-client",
  categoryId: "portfolio-cat-hvac",
  title: "AC not cooling",
  description: "Warm air after a power outage.",
  address: "Malvar, Batangas",
  preferredDate: "Tomorrow, 9–11 AM",
  urgency: "standard",
  status: "scheduled",
  budget: 149,
  createdAt: "2026-10-04T00:00:00.000Z",
  companyId: "portfolio-co-metrofix",
  referenceCode: "HF-SCHED",
  latitude: 14.045,
  longitude: 121.158,
};

function renderJob(job: JobRequest | null, id = job?.id ?? "missing") {
  const updateJobStatus = vi.fn(async () => {});
  const base = portfolioPartnerAppContext();
  render(
    <AppProviderPortfolioHarness value={{ ...base, jobs: job ? [job] : [], updateJobStatus }}>
      <PartnerJobDetail id={id} />
    </AppProviderPortfolioHarness>,
  );
  return { updateJobStatus };
}

describe("partner job detail", () => {
  it("hides a job that is not on this company's schedule", () => {
    renderJob(null, "portfolio-job-b1");
    expect(screen.getByRole("heading", { name: "Job not found" })).toBeInTheDocument();
  });

  it("walks the visit from scheduled to en route and opens the address in maps", async () => {
    const { updateJobStatus } = renderJob(scheduledJob);
    expect(screen.getByRole("button", { name: /Open in Maps/ })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=14.045,121.158",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Mark en route" })[0]);
    await waitFor(() => expect(updateJobStatus).toHaveBeenCalledWith("job-scheduled", "en_route"));
    expect(toast.success).toHaveBeenCalledWith("Status updated", expect.objectContaining({
      description: expect.stringContaining("en route"),
    }));
  });

  it("confirms a schedule, then closes the job, and stops once it is complete", async () => {
    const assigned = { ...scheduledJob, id: "job-assigned", status: "assigned" as JobStatus };
    const { updateJobStatus } = renderJob(assigned);
    fireEvent.click(screen.getAllByRole("button", { name: "Confirm schedule" })[0]);
    await waitFor(() => expect(updateJobStatus).toHaveBeenCalledWith("job-assigned", "scheduled"));
  });

  it("does not offer another step after the visit is complete or cancelled", () => {
    const { unmount } = render(
      <AppProviderPortfolioHarness value={{
        ...portfolioPartnerAppContext(),
        jobs: [{ ...scheduledJob, status: "completed" }],
      }}>
        <PartnerJobDetail id="job-scheduled" />
      </AppProviderPortfolioHarness>,
    );
    expect(screen.getByText("This job is complete. Great work.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark|Confirm|Start/ })).not.toBeInTheDocument();
    unmount();

    render(
      <AppProviderPortfolioHarness value={{
        ...portfolioPartnerAppContext(),
        jobs: [{ ...scheduledJob, id: "job-cancelled", status: "cancelled" }],
      }}>
        <PartnerJobDetail id="job-cancelled" />
      </AppProviderPortfolioHarness>,
    );
    expect(screen.queryByRole("button", { name: /Mark|Confirm|Start|Update status/ })).not.toBeInTheDocument();
  });

  it("keeps the current status when the update fails", async () => {
    const updateJobStatus = vi.fn(async () => {
      throw new Error("Network down");
    });
    render(
      <AppProviderPortfolioHarness value={{
        ...portfolioPartnerAppContext(),
        jobs: [{ ...scheduledJob, status: "in_progress" }],
        updateJobStatus,
      }}>
        <PartnerJobDetail id="job-scheduled" />
      </AppProviderPortfolioHarness>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Mark complete" })[0]);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn’t update job", { description: "Network down" });
    });
    expect(screen.getAllByText("in progress").length).toBeGreaterThan(0);
  });
});
