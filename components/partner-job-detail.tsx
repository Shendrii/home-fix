"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  Navigation,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge } from "@/components/screens";
import { JobNotesPanel } from "@/components/job-notes-panel";
import { JobPhotosPanel } from "@/components/job-photos-panel";
import { PartnerLocationBroadcaster } from "@/components/partner-location-broadcaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { JobRequest, JobStatus } from "@/lib/types";

const PARTNER_STEPS = [
  { id: "assigned", label: "Accepted", hint: "Review details and confirm the visit window." },
  { id: "scheduled", label: "Scheduled", hint: "Homeowner knows when you are coming." },
  { id: "en_route", label: "En route", hint: "Head to the service address." },
  { id: "in_progress", label: "In progress", hint: "Work is underway on site." },
  { id: "completed", label: "Completed", hint: "Job closed and ready for payout review." },
] as const;

const NEXT_STATUS: Record<JobStatus, JobStatus | null> = {
  open: null,
  assigned: "scheduled",
  scheduled: "en_route",
  en_route: "in_progress",
  in_progress: "completed",
  completed: null,
  cancelled: null,
};

const ACTION_LABELS: Partial<Record<JobStatus, string>> = {
  assigned: "Confirm schedule",
  scheduled: "Mark en route",
  en_route: "Start work",
  in_progress: "Mark complete",
};

function stepIndex(status: JobStatus) {
  const order: JobStatus[] = ["assigned", "scheduled", "en_route", "in_progress", "completed"];
  const idx = order.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function mapsUrl(job: JobRequest) {
  if (job.latitude != null && job.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`;
}

export function PartnerJobDetail({ id }: { id: string }) {
  const { jobs, categories, currentPartnerCompanyId, updateJobStatus } = useApp();
  const job = jobs.find((item) => item.id === id);
  const category = categories.find((item) => item.id === job?.categoryId);
  const jobLabel = job?.referenceCode ?? job?.id.slice(0, 8);

  if (!job || job.companyId !== currentPartnerCompanyId) {
    return (
      <Card className="border-0 bg-card">
        <CardContent className="py-12 text-center">
          <h1 className="text-xl font-bold">Job not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This job may have been reassigned or is no longer on your schedule.</p>
          <Button render={<Link href="/partner/jobs" />} className="mt-6 h-11 rounded-xl">
            <ArrowLeft /> Back to My jobs
          </Button>
        </CardContent>
      </Card>
    );
  }

  const index = stepIndex(job.status);
  const next = NEXT_STATUS[job.status];
  const progress = job.status === "completed" ? 100 : ((index + 1) / PARTNER_STEPS.length) * 100;
  const resolvedJob = job;

  async function advanceStatus() {
    if (!next) return;
    try {
      await updateJobStatus(resolvedJob.id, next);
      toast.success("Status updated", {
        description: `${jobLabel} is now ${next.replace("_", " ")}.`,
      });
    } catch (error) {
      toast.error("Couldn’t update job", {
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  }

  return (
    <>
      <PartnerLocationBroadcaster companyId={currentPartnerCompanyId ?? ""} active={Boolean(currentPartnerCompanyId) && job.status === "en_route"} />
      <div className="mb-4">
        <Button
          variant="ghost"
          render={<Link href="/partner/jobs" />}
          className="h-10 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> My jobs
        </Button>
      </div>

      <PageHeader
        eyebrow={jobLabel}
        title={job.title}
        description={category?.name ?? "Service visit"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            {job.urgency === "urgent" && (
              <Badge className="border-0 bg-orange-50 text-orange-700">Urgent</Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
        <div className="space-y-5">
          <Card className="border-0 bg-card shadow-[0_8px_30px_rgba(30,41,59,.05)]">
            <CardHeader>
              <CardTitle>Field progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-6 h-2" />
              <ol className="space-y-4">
                {PARTNER_STEPS.map((step, i) => {
                  const done = i < index || job.status === "completed";
                  const current = i === index && job.status !== "completed";
                  return (
                    <li key={step.id} className="flex gap-3">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          done ? "bg-primary text-primary-foreground" : current ? "bg-secondary text-secondary-foreground ring-2 ring-ring" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className={`text-sm font-semibold ${done || current ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {current && <p className="mt-1 text-xs leading-5 text-primary">{step.hint}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card">
            <CardHeader>
              <CardTitle>Homeowner notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>{job.description || "No additional notes from the homeowner."}</p>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm font-semibold text-muted-foreground">Service category</p>
                <p className="mt-1 flex items-center gap-2 font-semibold text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  {category?.name ?? "Home service"}
                </p>
              </div>
            </CardContent>
          </Card>

          <JobPhotosPanel
            jobId={job.id}
            title="Before / after photos"
            uploadKinds={["before", "after"]}
            emptyLabel="No before/after photos yet. Add some so the homeowner can see the completed work."
          />

          <JobNotesPanel jobId={job.id} />
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden border-0 bg-foreground text-white">
            <CardContent className="p-0">
              <div className="bg-primary px-5 py-5">
                <p className="text-sm font-semibold text-primary-foreground/80">Visit window</p>
                <p className="mt-2 flex items-start gap-2 text-lg font-bold leading-snug">
                  <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary-foreground/80" />
                  {job.preferredDate}
                </p>
              </div>
              <div className="space-y-4 px-5 py-5">
                <div>
                  <p className="text-xs text-primary-foreground/70">Service address</p>
                  <p className="mt-1 text-sm font-medium leading-6">{job.address}</p>
                </div>
                <Button
                  variant="secondary"
                  className="h-11 w-full rounded-xl bg-card text-foreground hover:bg-muted"
                  render={
                    <a href={mapsUrl(job)} target="_blank" rel="noopener noreferrer">
                      <Navigation className="size-4" /> Open in Maps
                    </a>
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated payout</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">${job.budget}</p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {job.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Final amount may change after scope confirmation with the homeowner.
              </p>
              {next && (
                <Button onClick={() => void advanceStatus()} className="h-12 w-full rounded-xl text-base">
                  {ACTION_LABELS[job.status] ?? "Update status"} <ArrowRight />
                </Button>
              )}
              {job.status === "completed" && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-800">
                  This job is complete. Great work.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-dashed border-border bg-muted">
            <CardContent className="flex items-start gap-3 pt-6">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="text-sm leading-6 text-muted-foreground">
                <p className="font-semibold text-foreground">On-site checklist</p>
                <p className="mt-1">Confirm access, review scope with the client, then update status as you go so the homeowner stays informed.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {next && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur lg:hidden">
          <Button onClick={() => void advanceStatus()} className="h-12 w-full rounded-xl text-base">
            {ACTION_LABELS[job.status] ?? "Update status"} <ChevronRight />
          </Button>
        </div>
      )}
    </>
  );
}
