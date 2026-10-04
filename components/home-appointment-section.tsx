import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarPlus,
  CircleCheckBig,
  Search,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const journeySteps: {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Book",
    title: "Book your visit",
    description: "Share the issue, photos, and when you’re available.",
    icon: CalendarPlus,
  },
  {
    label: "Confirm",
    title: "Pro confirmed",
    description: "A verified partner accepts and locks in your appointment.",
    icon: BadgeCheck,
  },
  {
    label: "Assess",
    title: "On-site assessment",
    description: "Your pro inspects the problem and explains the plan.",
    icon: Search,
  },
  {
    label: "Repair",
    title: "Repair and service",
    description: "The fix is done with clear updates along the way.",
    icon: Wrench,
  },
  {
    label: "Complete",
    title: "Job complete",
    description: "Sign off, review the work, and get back to your day.",
    icon: CircleCheckBig,
  },
];

const primaryLink =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring active:translate-y-px sm:w-auto";
const secondaryLink =
  "inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-6 font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring active:translate-y-px sm:w-auto";

export function HomeAppointmentSection() {
  return (
    <section
      id="create-appointment"
      aria-labelledby="appointment-heading"
      className="scroll-mt-24 border-y border-border bg-card py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-5">
        <div className="max-w-2xl">
          <h2
            id="appointment-heading"
            className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            Create an appointment in minutes
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
            From the first request to a finished repair, you always know what happens next.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/services" className={primaryLink}>
              Browse services
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <Link href="/request" className={secondaryLink}>
              Book an appointment
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Browse without an account. Sign in only when you book.
          </p>
        </div>

        <ol className="mt-14 grid gap-8 md:grid-cols-5 md:gap-4">
          {journeySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="relative flex gap-4 md:flex-col md:items-start">
                <div
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary tabular-nums">
                    {index + 1}. {step.label}
                  </p>
                  <h3 className="mt-1 font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
