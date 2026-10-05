import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { DeclineOfferButton } from "@/components/decline-offer-button";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.mocked(toast.error).mockClear();
});

describe("decline offer", () => {
  it("sends the reason the partner picked", async () => {
    const onDecline = vi.fn(async () => {});
    render(<DeclineOfferButton onDecline={onDecline} />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.click(await screen.findByRole("button", { name: "Not the right service type" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm decline" }));
    await waitFor(() => expect(onDecline).toHaveBeenCalledWith("wrong_category"));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Why are you declining?" })).not.toBeInTheDocument());
  });

  it("keeps the dialog open when declining fails", async () => {
    const onDecline = vi.fn(async () => {
      throw new Error("Offer already closed");
    });
    render(<DeclineOfferButton onDecline={onDecline} />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.click(await screen.findByRole("button", { name: "I'm not available" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm decline" }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn’t decline offer", {
        description: "Offer already closed",
      });
    });
    expect(screen.getByRole("heading", { name: "Why are you declining?" })).toBeInTheDocument();
  });

  it("does not decline when the partner cancels", async () => {
    const onDecline = vi.fn();
    render(<DeclineOfferButton onDecline={onDecline} />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(onDecline).not.toHaveBeenCalled();
  });
});
