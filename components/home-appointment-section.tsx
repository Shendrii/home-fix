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
    title: "Repair & service",
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

export function HomeAppointmentSection() {
  return (
    <section
      id="create-appointment"
      aria-labelledby="appointment-heading"
      className="relative overflow-hidden border-y border-teal-100 bg-gradient-to-b from-white via-teal-50/40 to-[#faf8f3] py-16 sm:py-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-0 size-72 rounded-full bg-teal-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 bottom-0 size-56 rounded-full bg-amber-100/50 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Simple, transparent service
          </p>
          <h2
            id="appointment-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            Create an appointment in minutes
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            From first click to a finished repair—you always know what happens next.
            No phone tag, no guesswork.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/services"
              className="inline-flex h-14 w-full min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-teal-600 px-8 text-base font-semibold text-white shadow-lg shadow-teal-600/25 transition-colors hover:bg-teal-700 sm:w-auto"
            >
              Browse services
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="/request"
              className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Book an appointment
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Browse without an account · Sign in only when you book
          </p>
        </div>

        <div className="mt-14 lg:mt-16">
          <p className="mb-8 text-center text-sm font-semibold text-slate-700">
            Your journey with HomeFix
          </p>

          {/* Desktop & tablet: horizontal step flow */}
          <ol className="hidden md:grid md:grid-cols-5 md:gap-2">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === journeySteps.length - 1;
              return (
                <li key={step.label} className="relative flex flex-col items-center text-center">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[calc(50%+2rem)] top-8 h-0.5 w-[calc(100%-4rem)] bg-gradient-to-r from-teal-300 to-teal-200"
                    />
                  )}
                  <div className="relative z-10 grid size-16 place-items-center rounded-2xl border border-teal-100 bg-white shadow-md shadow-slate-200/50">
                    <Icon className="size-7 text-teal-700" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <span className="mt-4 inline-flex rounded-full bg-teal-100/80 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-teal-800">
                    {step.label}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 max-w-[11rem] text-xs leading-5 text-slate-600">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>

          {/* Mobile: scannable vertical timeline */}
          <ol className="mx-auto max-w-md space-y-0 md:hidden">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === journeySteps.length - 1;
              return (
                <li key={step.label} className="relative flex gap-4 pb-8">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-8 top-16 bottom-0 w-0.5 bg-teal-200"
                    />
                  )}
                  <div
                    className={cn(
                      "relative z-10 grid size-16 shrink-0 place-items-center rounded-2xl border border-teal-100 bg-white shadow-md shadow-slate-200/50",
                    )}
                  >
                    <Icon className="size-7 text-teal-700" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex rounded-full bg-teal-100/80 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-teal-800">
                      Step {index + 1} · {step.label}
                    </span>
                    <h3 className="mt-2 font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
