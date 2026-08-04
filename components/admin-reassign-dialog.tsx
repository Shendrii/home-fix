"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

/**
 * Manual reassignment for a stuck job. Wraps the existing `admin_manage_dispatch`
 * RPC's `assign` action — the RPC already re-validates that the chosen company is
 * verified and category-qualified, so this dialog only needs to offer a picker.
 */
export function AdminReassignDialog({
  jobId,
  categoryId,
  triggerLabel = "Reassign",
  triggerVariant = "outline",
  triggerClassName,
}: {
  jobId: string;
  categoryId: string;
  triggerLabel?: string;
  triggerVariant?: "outline" | "default" | "secondary";
  triggerClassName?: string;
}) {
  const { companies } = useApp();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const eligible = companies.filter(
    (company) => company.verified && company.services.includes(categoryId),
  );

  async function submit() {
    if (!companyId) {
      toast.error("Choose a company first");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    if (!supabase) {
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase.rpc("admin_manage_dispatch", {
      p_request_id: jobId,
      p_action: "assign",
      p_company_id: companyId,
      p_reason: reason.trim() || "Manually reassigned by operations",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Reassignment failed", { description: error.message });
      return;
    }
    if ((data as { status?: string } | null)?.status === "ok") {
      toast.success("Job reassigned", { description: "The selected partner is now assigned to this job." });
      setOpen(false);
      setCompanyId(undefined);
      setReason("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size="sm" className={triggerClassName}>
            <UserCog /> {triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign this job</DialogTitle>
          <DialogDescription>
            Only verified partners qualified for this job&apos;s category are shown. This
            supersedes any pending offers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={companyId} onValueChange={(value) => setCompanyId(value ?? undefined)}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Choose a partner company" />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
              {!eligible.length && (
                <SelectItem value="__none" disabled>
                  No eligible verified partners for this category
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for reassignment (optional, kept in the audit trail)"
            className="min-h-20"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!companyId || submitting} onClick={() => void submit()}>
            {submitting ? "Reassigning…" : "Confirm reassignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
