"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { DeclineReason } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const REASONS: { id: DeclineReason; label: string }[] = [
  { id: "too_far", label: "Too far away" },
  { id: "wrong_category", label: "Not the right service type" },
  { id: "unavailable", label: "I'm not available" },
  { id: "other", label: "Other" },
];

/**
 * Captures why a partner declined an exclusive offer. The reason feeds the
 * admin leaderboard's response-time/decline breakdown later — kept as a
 * small fixed set of codes rather than free text so it stays aggregable.
 */
export function DeclineOfferButton({
  onDecline,
}: {
  onDecline: (reason: DeclineReason) => void | Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DeclineReason>("too_far");
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    setSubmitting(true);
    try {
      await onDecline(reason);
      setOpen(false);
    } catch (error) {
      toast.error("Couldn’t decline offer", {
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-11 rounded-xl">Decline</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why are you declining?</DialogTitle>
          <DialogDescription>This helps us send you better-matched offers.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {REASONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setReason(item.id)}
              className={cn(
                "rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition-colors",
                reason === item.id ? "border-teal-600 bg-teal-50 text-teal-900" : "border-slate-100 text-slate-700 hover:border-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={() => void confirm()}>
            {submitting ? "Declining…" : "Confirm decline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
