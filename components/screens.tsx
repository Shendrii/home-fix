"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, CalendarDays, Check,
  Bug, ChevronRight, CircleDollarSign, Clock3, Hammer, House, MapPin, Paintbrush,
  Phone, Search, Shield, Sparkles, Star, Thermometer, Trees, TrendingUp, Users,
  WashingMachine, Wrench, Zap,
} from "lucide-react";
import { formatOperatingHours } from "@/lib/company-display";
import { useApp } from "@/components/app-provider";
import { useAuth } from "@/components/auth-provider";
import { AdminUserEditor } from "@/components/admin-user-editor";
import { ViewAsButton } from "@/components/view-as-controls";
import { canActAsRole } from "@/lib/acting-as";
import { roleLabel } from "@/lib/profile";
import { PageHeader } from "@/components/app-shell";
import { PartnerJobsCalendar } from "@/components/partner-jobs-calendar";
import { JobPhotosPanel } from "@/components/job-photos-panel";
import { DeclineOfferButton } from "@/components/decline-offer-button";
import { LivePartnerMap } from "@/components/live-partner-map";
import { PushOptIn } from "@/components/push-opt-in";
import { bookingPath } from "@/lib/auth-return";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import type { JobRequest, JobStatus } from "@/lib/types";

const icons = {
  Wrench, Zap, Sparkles, Thermometer, Hammer, Paintbrush,
  WashingMachine, House, Shield, Bug, Trees,
} as const;

export function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    open: "bg-orange-50 text-orange-700",
    assigned: "bg-sky-50 text-sky-700",
    scheduled: "bg-violet-50 text-violet-700",
    en_route: "bg-cyan-50 text-cyan-700",
    in_progress: "bg-teal-50 text-teal-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return <Badge className={`${styles[status]} border-0 capitalize`}>{status.replace("_", " ")}</Badge>;
}

function ServiceCard({
  id,
  name,
  description,
  icon,
  color,
  startingPrice,
  variant = "browse",
}: ReturnType<typeof useApp>["categories"][number] & { variant?: "browse" | "quick-book" }) {
  const Icon = icons[icon as keyof typeof icons] ?? Wrench;
  const bookHref = bookingPath(id);

  if (variant === "quick-book") {
    return (
      <Link href={bookHref} className="group">
        <Card className="h-full border-0 bg-white shadow-[0_8px_30px_rgba(30,41,59,.05)] transition-transform hover:-translate-y-0.5">
          <CardContent className="flex items-start gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${color}`}><Icon className="size-5" /></span>
            <div className="min-w-0"><p className="font-semibold text-slate-900">{name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p><p className="mt-2 text-xs font-semibold text-teal-700">From ${startingPrice}</p></div>
            <ChevronRight className="ml-auto mt-2 size-4 text-slate-300 group-hover:text-teal-600" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="h-full border-0 bg-white shadow-[0_8px_30px_rgba(30,41,59,.05)]">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${color}`}><Icon className="size-5" /></span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            <p className="mt-2 text-xs font-semibold text-teal-700">From ${startingPrice}</p>
          </div>
        </div>
        <Button render={<Link href={bookHref} />} className="mt-auto h-10 w-full rounded-xl">
          Book appointment <ArrowRight />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClientHome() {
  const { categories, viewerJobs: jobs, companies } = useApp();
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const active = jobs.find((job) => job.status === "in_progress");
  const activeCompany = active ? companies.find((company) => company.id === active.companyId) : undefined;
  const visibleCategories = categories
    .filter((category) => category.active)
    .filter((category) => `${category.name} ${category.description}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, query ? categories.length : 6);
  return <>
    <section className="relative mb-8 overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 text-white sm:px-8 sm:py-10">
      <div className="absolute -right-16 -top-16 size-52 rounded-full bg-teal-400/20 blur-2xl" />
      <p className="text-sm text-teal-300">Welcome back{firstName ? `, ${firstName}` : ""}</p>
      <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">What can we fix for you today?</h1>
      <div className="relative mt-6 max-w-xl"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 rounded-2xl border-0 bg-white pl-12 text-slate-900 shadow-xl" placeholder="Search plumbing, cleaning, electrical…" aria-label="Search home services" /></div>
    </section>
    {active && <section className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Active visit</h2><Link href={`/jobs/${active.id}`} className="text-sm font-semibold text-teal-700">View details</Link></div><Card className="border-0 bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-900/10"><CardContent><div className="flex items-start justify-between"><div><Badge className="border-white/15 bg-white/15 text-white">In progress</Badge><h3 className="mt-3 text-xl font-bold">{active.title}</h3><p className="mt-1 text-sm text-teal-50">{activeCompany?.name ?? "Your assigned partner"}</p></div><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><Wrench /></span></div><div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-sm"><span className="flex items-center gap-2"><MapPin className="size-4" />{active.address}</span><ArrowRight className="size-5" /></div></CardContent></Card></section>}
    <section className="mb-8"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-bold">{query ? "Search results" : "Popular services"}</h2><p className="text-sm text-slate-500">{query ? `${visibleCategories.length} matching services` : "Trusted help, right when you need it"}</p></div><Link href="/services" className="text-sm font-semibold text-teal-700">See all</Link></div><div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">{visibleCategories.map((category) => <ServiceCard key={category.id} {...category} variant="quick-book" />)}</div>{query && !visibleCategories.length && <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No matching service yet. You can still describe your issue in a custom request.</div>}</section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent jobs</h2><Link href="/jobs" className="text-sm font-semibold text-teal-700">All jobs</Link></div><div className="grid gap-3 lg:grid-cols-2">{jobs.filter((job) => !["open", "in_progress"].includes(job.status)).slice(0, 2).map((job) => <JobCard key={job.id} job={job} />)}</div>{!jobs.length && <Card className="border-0 bg-white"><CardContent className="py-10 text-center text-sm text-slate-500">No jobs yet. Book a service to get started.</CardContent></Card>}</section>
  </>;
}

export function ServicesScreen() {
  const { categories } = useApp();
  return <><PageHeader eyebrow="Home services" title="Find the right expert" description="Browse verified categories and starting prices. Sign in only when you’re ready to book." action={<Button render={<Link href={bookingPath()} />} className="h-11 rounded-xl">Book an appointment <ArrowRight /></Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.filter((c) => c.active).map((category) => <ServiceCard key={category.id} {...category} variant="browse" />)}</div><Card className="mt-8 border-0 bg-orange-50"><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-orange-950">Not sure what service you need?</p><p className="mt-1 text-sm text-orange-800">Describe the issue and we’ll help route your request.</p></div><Button variant="outline" render={<Link href={bookingPath()} />} className="h-11 bg-white">Describe your issue</Button></CardContent></Card></>;
}

export function JobCard({ job, partner = false }: { job: JobRequest; partner?: boolean }) {
  const { categories } = useApp();
  const category = categories.find((item) => item.id === job.categoryId);
  const jobLabel = job.referenceCode ?? job.id.slice(0, 8);
  return <Card className="border-0 bg-white shadow-[0_6px_24px_rgba(30,41,59,.05)]"><CardContent><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={job.status} /><span className="text-xs text-slate-400">{jobLabel}</span></div><h3 className="mt-3 font-bold text-slate-900">{job.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{job.description}</p></div><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${category?.color ?? "bg-slate-100"}`}><Wrench className="size-4" /></span></div><div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><span className="flex items-center gap-2"><MapPin className="size-4" />{job.address}</span><span className="flex items-center gap-2"><CalendarDays className="size-4" />{job.preferredDate}</span></div><div className="mt-4 flex items-center justify-between border-t pt-3"><p className="font-bold text-slate-900">${job.budget} <span className="text-xs font-normal text-slate-400">estimate</span></p><Button variant="outline" render={<Link href={partner ? `/partner/jobs/${job.id}` : `/jobs/${job.id}`} />} className="h-10 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800">Details <ChevronRight /></Button></div></CardContent></Card>;
}

export function ClientJobs() {
  const { viewerJobs: jobs } = useApp();
  return <><PageHeader eyebrow="Your home" title="My jobs" description="Track matching, appointments, and completed service." action={<Button render={<Link href="/request" />} className="h-11">New request</Button>} /><div className="grid gap-4 lg:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div></>;
}

export function JobDetail({ id }: { id: string }) {
  const { viewerJobs: jobs, companies, updateJobStatus } = useApp();
  const job = jobs.find((item) => item.id === id);
  if (!job) return <Card><CardContent><h1 className="text-xl font-bold">Job not found</h1><Button render={<Link href="/jobs" />} className="mt-4">Back to jobs</Button></CardContent></Card>;
  const company = companies.find((item) => item.id === job.companyId);
  const steps = ["Request received", "Finding a qualified partner", "Professional assigned", "Visit scheduled", "Professional en route", "Work in progress", "Completed"];
  const index = {
    open: job.dispatchPhase === "exclusive_offers" || job.dispatchPhase === "broadcast" ? 1 : 0,
    assigned: 2, scheduled: 3, en_route: 4, in_progress: 5, completed: 6, cancelled: 0,
  }[job.status];
  return (
    <>
      <PageHeader eyebrow={job.referenceCode ?? job.id} title={job.title} description={job.description} action={<StatusBadge status={job.status} />} />
      <div className="grid gap-5 lg:grid-cols-[1.45fr_.8fr]">
        <div className="space-y-5">
          <Card className="border-0 bg-white"><CardHeader><CardTitle>Service progress</CardTitle></CardHeader><CardContent><Progress value={(index + 1) * (100 / steps.length)} className="mb-6" /><div className="space-y-1">{steps.map((step, i) => <div key={step} className="flex gap-3 py-2"><span className={`grid size-7 shrink-0 place-items-center rounded-full ${i <= index ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"}`}>{i < index ? <Check className="size-4" /> : <span className="text-xs">{i + 1}</span>}</span><div><p className={`text-sm font-semibold ${i <= index ? "text-slate-900" : "text-slate-400"}`}>{step}</p>{i === index && <p className="mt-1 text-xs text-teal-700">{job.status === "open" ? "We’re matching you with a qualified available professional." : "Current status · updates appear here"}</p>}</div></div>)}</div></CardContent></Card>
          {job.status === "en_route" && job.companyId && (
            <LivePartnerMap companyId={job.companyId} destinationLat={job.latitude} destinationLng={job.longitude} />
          )}
          <JobPhotosPanel
            jobId={job.id}
            title="Job photos"
            uploadKinds={["request"]}
            emptyLabel="No photos yet. Add photos of the issue, or check back after your visit for before/after shots."
          />
        </div>
        <div className="space-y-5">{company && <Card className="border-0 bg-slate-950 text-white"><CardContent><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-teal-500 font-bold">{company.initials}</span><div><p className="font-bold">{company.name}</p><p className="flex items-center gap-1 text-xs text-slate-300"><Star className="size-3 fill-amber-400 text-amber-400" />{company.rating} · {company.reviewCount} reviews</p></div></div><Button variant="secondary" className="mt-5 h-11 w-full" render={<a href={`tel:${company.phone}`} />}><Phone /> Call company</Button></CardContent></Card>}<Card className="border-0 bg-white"><CardContent className="space-y-4"><div><p className="text-xs text-slate-400">Appointment</p><p className="mt-1 font-semibold">{job.preferredDate}</p></div><div><p className="text-xs text-slate-400">Service address</p><p className="mt-1 text-sm font-semibold">{job.address}</p></div><div><p className="text-xs text-slate-400">Estimated total</p><p className="mt-1 text-xl font-bold">${job.budget}</p></div>{job.status === "open" && <Button variant="outline" className="w-full" onClick={() => void updateJobStatus(job.id, "cancelled").then(() => toast.success("Request cancelled")).catch((error) => toast.error("Couldn’t cancel request", { description: error.message }))}>Cancel request</Button>}</CardContent></Card></div>
      </div>
    </>
  );
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Wrench }) {
  return <Card className="border-0 bg-white"><CardContent><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div><span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="size-5" /></span></div></CardContent></Card>;
}

export function PartnerDashboard() {
  const {
    jobs, companies, currentPartnerCompanyId, partnerOnline, setPartnerOnline, acceptJob, offers, respondToOffer,
  } = useApp();
  const partnerCompany = companies.find((company) => company.id === currentPartnerCompanyId);
  if (!partnerCompany) return <Card className="border-0 bg-white"><CardContent className="py-12 text-center"><h1 className="text-xl font-bold">Partner profile unavailable</h1><p className="mt-2 text-sm text-slate-500">Your company invitation may still be processing. Refresh in a moment or contact HomeFix operations.</p></CardContent></Card>;
  const priorityOffers = offers.filter((offer) => offer.companyId === partnerCompany.id);
  const offerJobIds = new Set(priorityOffers.map((offer) => offer.jobId));
  const open = jobs.filter((job) => job.status === "open" && job.dispatchPhase === "broadcast" && partnerCompany.services.includes(job.categoryId));
  const accept = async (id: string, offerId?: string) => {
    const result = offerId
      ? await respondToOffer(offerId, "accept")
      : await acceptJob(id, partnerCompany.id);
    if (result.status === "success") toast.success("Job accepted", { description: "The job was added to My jobs." });
    else if (result.status === "already_claimed") toast.error("Already claimed", { description: "Another partner got there first. The queue has been refreshed." });
    else if (result.status === "offer_expired") toast.error("Offer expired", { description: "This job has moved to another dispatch wave." });
    else if (result.status === "offline") toast.error("Go online to claim work", { description: "Turn on availability before accepting a job." });
    else if (result.status === "error") toast.error("Couldn’t claim job", { description: result.message });
    else toast.error("Not eligible", { description: "This request is outside your company’s verified specializations." });
  };
  const companyJobs = jobs.filter((job) => job.companyId === partnerCompany.id);
  const completedJobs = companyJobs.filter((job) => job.status === "completed");
  const activeJobs = companyJobs.filter((job) => !["completed", "cancelled", "open"].includes(job.status));
  const completedEarnings = completedJobs.reduce((sum, job) => sum + job.budget, 0);
  return <><PageHeader eyebrow="Partner workspace" title="Your dispatch queue" description="Priority work is reserved for a short decision window; shared jobs appear when a wave expands." action={<div className="flex items-center gap-3"><PushOptIn /><div className="flex h-12 items-center gap-3 rounded-2xl border bg-white px-4"><span className={`size-2 rounded-full ${partnerOnline ? "bg-emerald-500" : "bg-slate-300"}`} /><span className="text-sm font-semibold">{partnerOnline ? "On duty" : "Off duty"}</span><Switch checked={partnerOnline} onCheckedChange={(value) => void setPartnerOnline(value).catch((error) => toast.error("Couldn’t update availability", { description: error.message }))} aria-label="Set availability" /></div></div>} /><div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Priority offers" value={`${priorityOffers.length}`} detail="Reserved for you" icon={BriefcaseBusiness} /><Metric label="Open nearby" value={`${open.length}`} detail="Shared opportunity" icon={BriefcaseBusiness} /><Metric label="Completed earnings" value={`$${completedEarnings}`} detail={`${completedJobs.length} completed jobs`} icon={CircleDollarSign} /><Metric label="Rating" value={`${partnerCompany.rating}`} detail={`${partnerCompany.reviewCount} reviews · ${activeJobs.length} active`} icon={Star} /></div><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-bold">Priority offers</h2><p className="text-sm text-slate-500">These jobs match your verified services, availability, and capacity.</p></div><Badge variant="secondary">{priorityOffers.length} reserved</Badge></div><div className="grid gap-4 xl:grid-cols-2">{priorityOffers.map((offer) => { const job = jobs.find((item) => item.id === offer.jobId); if (!job) return null; const seconds = Math.max(0, Math.ceil((new Date(offer.exclusiveUntil).getTime() - Date.now()) / 1_000)); return <Card key={offer.id} className="border border-teal-200 bg-white"><CardContent><div className="flex items-start justify-between gap-3"><div><Badge className="border-0 bg-teal-50 text-teal-700">Reserved · {seconds}s</Badge><h3 className="mt-3 text-lg font-bold">{job.title}</h3><p className="mt-1 text-sm text-slate-500">{job.description}</p></div><p className="shrink-0 text-xl font-bold">${job.budget}</p></div><div className="mt-4 space-y-2 text-xs text-slate-500"><p className="flex items-center gap-2"><MapPin className="size-4" />{job.address}{offer.distanceKm != null ? ` · ${offer.distanceKm.toFixed(1)} km` : ""}</p><p className="flex items-center gap-2"><Clock3 className="size-4" />{job.preferredDate}</p><p className="text-teal-700">{offer.reason ?? "Qualified match"}</p></div><div className="mt-5 grid grid-cols-2 gap-3"><DeclineOfferButton onDecline={(reason) => respondToOffer(offer.id, "decline", reason)} /><Button disabled={!partnerOnline} onClick={() => void accept(job.id, offer.id)} className="h-11 rounded-xl">Accept job <ArrowRight /></Button></div></CardContent></Card>; })}</div>{!priorityOffers.length && <p className="mb-7 rounded-2xl border border-dashed bg-white p-4 text-sm text-slate-500">{partnerOnline ? "No reserved offers right now. New matches appear when a client request fits your services." : "Go on duty to receive priority offers and claim broadcast jobs."}</p>}<div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-bold">Open nearby opportunities</h2><p className="text-sm text-slate-500">These jobs are now available to eligible partners in the area.</p></div><Badge variant="secondary">{open.length} open</Badge></div><div className="grid gap-4 xl:grid-cols-2">{open.filter((job) => !offerJobIds.has(job.id)).map((job) => <Card key={job.id} className="border-0 bg-white"><CardContent><div className="flex items-start justify-between gap-3"><div><div className="flex gap-2"><Badge className={job.urgency === "urgent" ? "border-0 bg-orange-50 text-orange-700" : ""}>{job.urgency}</Badge><span className="text-xs text-slate-400">{job.createdAt}</span></div><h3 className="mt-3 text-lg font-bold">{job.title}</h3><p className="mt-1 text-sm text-slate-500">{job.description}</p></div><p className="shrink-0 text-xl font-bold">${job.budget}</p></div><div className="mt-4 space-y-2 text-xs text-slate-500"><p className="flex items-center gap-2"><MapPin className="size-4" />{job.address}</p><p className="flex items-center gap-2"><Clock3 className="size-4" />{job.preferredDate}</p></div><Button disabled={!partnerOnline} onClick={() => void accept(job.id)} className="mt-5 h-11 w-full rounded-xl">Claim job <ArrowRight /></Button></CardContent></Card>)}</div>{!open.length && <Card><CardContent className="py-12 text-center"><BadgeCheck className="mx-auto size-10 text-teal-600" /><h3 className="mt-3 font-bold">No broadcast work nearby</h3><p className="text-sm text-slate-500">{partnerOnline ? "Open jobs in your service categories will appear here after dispatch moves to broadcast." : "Turn on duty to claim jobs. Matching open requests in your categories should still appear below when broadcast."}</p></CardContent></Card>}</>;
}

export function PartnerJobs() {
  const { jobs, currentPartnerCompanyId, updateJobStatus } = useApp();
  const [view, setView] = useState<"list" | "calendar">("list");
  const assigned = jobs.filter((job) => job.companyId === currentPartnerCompanyId);
  const transitions: Record<JobStatus, JobStatus | null> = {
    open: "assigned",
    assigned: "scheduled",
    scheduled: "en_route",
    en_route: "in_progress",
    in_progress: "completed",
    completed: null,
    cancelled: null,
  };
  const nextStatus = (status: JobStatus) => transitions[status];
  const labels: Partial<Record<JobStatus, string>> = {
    assigned: "Confirm schedule",
    scheduled: "Mark en route",
    en_route: "Start work",
    in_progress: "Mark complete",
  };
  return (
    <>
      <PageHeader
        eyebrow="Field work"
        title="My jobs"
        description="Your active schedule and completed work in one place."
        action={
          <div className="flex h-11 items-center gap-1 rounded-xl border bg-white p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${view === "list" ? "bg-teal-600 text-white" : "text-slate-500 hover:text-slate-900"}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${view === "calendar" ? "bg-teal-600 text-white" : "text-slate-500 hover:text-slate-900"}`}
            >
              Calendar
            </button>
          </div>
        }
      />
      {view === "calendar" ? (
        <PartnerJobsCalendar jobs={assigned} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {assigned.map((job) => {
            const next = nextStatus(job.status);
            const label = job.referenceCode ?? job.id.slice(0, 8);
            return (
              <div key={job.id} className="space-y-2">
                <JobCard job={job} partner />
                {next && (
                  <Button
                    onClick={() => {
                      void updateJobStatus(job.id, next)
                        .then(() => toast.success(`${label} updated`, { description: `Status is now ${next.replace("_", " ")}.` }))
                        .catch((error) => toast.error("Couldn’t update job", { description: error.message }));
                    }}
                    className="h-11 w-full"
                  >
                    {labels[job.status] ?? "Update status"} <ArrowRight />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!assigned.length && <Card className="border-0 bg-white"><CardContent className="py-12 text-center text-sm text-slate-500">No assigned jobs yet. Accept work from your dispatch queue.</CardContent></Card>}
    </>
  );
}

export function PartnerCompany() {
  const { companies, categories, currentPartnerCompanyId, jobs } = useApp();
  const company = companies.find((item) => item.id === currentPartnerCompanyId);
  if (!company) {
    return (
      <Card className="border-0 bg-white">
        <CardContent className="py-12 text-center">
          <h1 className="text-xl font-bold">Partner profile unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">Your company invitation may still be processing.</p>
        </CardContent>
      </Card>
    );
  }
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "Service";
  const completedCount = jobs.filter((job) => job.companyId === company.id && job.status === "completed").length;
  const verificationLabel = company.verified ? "Verified on HomeFix" : "Verification pending";
  return (
    <>
      <PageHeader
        eyebrow="Business profile"
        title={company.name}
        description="Your public company profile shown to homeowners."
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="border-0 bg-white">
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-teal-600 text-xl font-bold text-white">{company.initials}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{company.name}</h2>
                  {company.verified && <BadgeCheck className="size-5 text-teal-600" />}
                </div>
                <p className="mt-1 text-sm text-slate-500">{company.description?.trim() || "Add a company description in operations settings."}</p>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Rating", company.rating], ["Reviews", company.reviewCount], ["Response", company.responseTime], ["Completed jobs", completedCount]].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 font-bold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <p className="mb-3 text-sm font-bold">Services offered</p>
              <div className="flex flex-wrap gap-2">
                {company.services.length ? company.services.map((service) => (
                  <Badge key={service} variant="secondary">{categoryName(service)}</Badge>
                )) : <p className="text-sm text-slate-500">No services linked yet.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white">
          <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              {company.verified ? <Check className="size-4 text-teal-600" /> : <Clock3 className="size-4 text-orange-600" />}
              {verificationLabel}
            </p>
            {company.phone && <p className="text-slate-600"><span className="text-slate-400">Phone</span><br />{company.phone}</p>}
            {company.email && <p className="text-slate-600"><span className="text-slate-400">Email</span><br />{company.email}</p>}
            <p className="text-slate-600"><span className="text-slate-400">Capacity</span><br />Up to {company.maxConcurrentJobs ?? 1} concurrent jobs</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card className="border-0 bg-white">
          <CardContent>
            <MapPin className="size-5 text-teal-700" />
            <p className="mt-3 font-bold">Coverage area</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{company.serviceArea?.trim() || "Not set yet"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white">
          <CardContent>
            <Clock3 className="size-5 text-teal-700" />
            <p className="mt-3 font-bold">Operating hours</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{formatOperatingHours(company.operatingHours) ?? "Not set yet"}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

type AdminKind = "overview" | "jobs" | "companies" | "services" | "users";
const ROLE_FILTERS = [
  { id: "all", label: "All" },
  { id: "client", label: "Homeowner" },
  { id: "partner", label: "Service partner" },
  { id: "admin", label: "Operations" },
  { id: "superadmin", label: "Super admin" },
] as const;

export function AdminScreen({ kind }: { kind: AdminKind }) {
  const { jobs, companies, categories, users, setCategoryActive, dataReady } = useApp();
  const { profile } = useAuth();
  const isSuperadmin = profile?.role === "superadmin";
  const [adminQuery, setAdminQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]["id"]>("all");
  const query = adminQuery.toLowerCase();
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "";
  const filteredJobs = jobs.filter((job) => `${job.referenceCode ?? job.id} ${job.title} ${job.status}`.toLowerCase().includes(query));
  const filteredCompanies = companies.filter((company) =>
    `${company.name} ${company.services.map(categoryName).join(" ")}`.toLowerCase().includes(query),
  );
  const filteredCategories = categories.filter((category) => `${category.name} ${category.description}`.toLowerCase().includes(query));
  const filteredUsers = users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query);
    return matchesQuery && (roleFilter === "all" || user.role === roleFilter);
  });
  if (kind === "overview") {
    const urgentOpen = jobs.filter((job) => job.status === "open" && job.urgency === "urgent").length;
    const clientCount = users.filter((user) => user.role === "client").length;
    return (
      <>
        <PageHeader eyebrow="Operations center" title="Marketplace health" description="Live counts from your Supabase marketplace." />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Open requests" value={`${jobs.filter((j) => j.status === "open").length}`} detail={`${urgentOpen} urgent`} icon={BriefcaseBusiness} />
          <Metric label="Companies" value={`${companies.length}`} detail={`${companies.filter((c) => !c.verified).length} pending review`} icon={Building2} />
          <Metric label="Service categories" value={`${categories.filter((c) => c.active).length}`} detail={`${categories.length} total`} icon={TrendingUp} />
          <Metric label="Users" value={`${users.length}`} detail={`${clientCount} clients`} icon={Users} />
        </div>
        <div className="mt-6">
          <Card className="border-0 bg-white">
            <CardHeader><CardTitle>Recent requests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-white text-teal-700"><Wrench className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{job.title}</p>
                    <p className="text-xs text-slate-400">{job.referenceCode ?? job.id.slice(0, 8)} · {job.createdAt}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
              {!jobs.length && <p className="text-sm text-slate-500">No service requests yet.</p>}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
  const titles = { jobs: ["All jobs", "Monitor requests across every stage."], companies: ["Service companies", "Verification, quality, and marketplace coverage."], services: ["Service catalog", "Control what homeowners can request."], users: ["HomeFix users", "Homeowners, partners, and operations staff."] } as const;
  const [title, description] = titles[kind];
  const emptyMessage = {
    jobs: "No jobs match your search.",
    companies: "No companies found.",
    services: "No services in the catalog.",
    users: "No users found.",
  }[kind];
  return (
    <>
      <PageHeader eyebrow="Administration" title={title} description={description} action={<Input value={adminQuery} onChange={(event) => setAdminQuery(event.target.value)} className="h-11 w-full bg-white sm:w-64" placeholder={`Search ${kind}…`} aria-label={`Search ${kind}`} />} />
      {!dataReady && kind !== "jobs" && <Card className="border-0 bg-white"><CardContent className="py-10 text-center text-sm text-slate-500">Loading live data…</CardContent></Card>}
      {dataReady && kind === "jobs" && <div className="grid gap-3 lg:grid-cols-2">{filteredJobs.map((job) => <JobCard key={job.id} job={job} />)}</div>}
      {dataReady && kind === "companies" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCompanies.map((company) => (
            <Link key={company.id} href={`/admin/companies/${company.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Card className="h-full border-0 bg-white transition-transform hover:-translate-y-0.5">
                <CardContent>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-slate-900 font-bold text-white">{company.initials}</span>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{company.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500"><Star className="size-3 fill-amber-400 text-amber-400" />{company.rating} · {company.reviewCount} reviews</p>
                    </div>
                  </div>
                  {company.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {company.services.slice(0, 3).map((service) => (
                        <Badge key={service} variant="secondary" className="text-[10px]">{categoryName(service)}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <Badge className={company.verified ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}>{company.verified ? "Verified" : "Review needed"}</Badge>
                    <span className="text-xs text-slate-400">{company.isAvailable ? "On duty" : "Off duty"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {dataReady && kind === "services" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map((category) => {
            const Icon = icons[category.icon as keyof typeof icons] ?? Wrench;
            return (
              <Card key={category.id} className="border-0 bg-white">
                <CardContent className="flex items-center gap-3">
                  <span className={`grid size-11 place-items-center rounded-xl ${category.color}`}><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{category.name}</p>
                    <p className="text-xs text-slate-400">From ${category.startingPrice}</p>
                  </div>
                  <Switch
                    checked={category.active}
                    onCheckedChange={(value) =>
                      void setCategoryActive(category.id, value).catch((error) =>
                        toast.error("Couldn’t update service", { description: error.message }),
                      )
                    }
                    aria-label={`Toggle ${category.name}`}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {dataReady && kind === "users" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by role">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={roleFilter === filter.id}
                onClick={() => setRoleFilter(filter.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${roleFilter === filter.id ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{user.email || "No email on file"}</p>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary">{roleLabel(user.role)}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{user.phone || "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={user.address}>{user.address || "—"}</td>
                    <td className="px-4 py-3">
                      {isSuperadmin && (
                        <div className="flex justify-end gap-2">
                          <AdminUserEditor user={user} onSaved={() => undefined} />
                          {canActAsRole(user.role) && <ViewAsButton userId={user.id} />}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {dataReady && ((kind === "jobs" && !filteredJobs.length) || (kind === "companies" && !filteredCompanies.length) || (kind === "services" && !filteredCategories.length) || (kind === "users" && !filteredUsers.length)) && (
        <Card className="mt-4 border-0 bg-white"><CardContent className="py-10 text-center text-sm text-slate-500">{emptyMessage}</CardContent></Card>
      )}
    </>
  );
}
