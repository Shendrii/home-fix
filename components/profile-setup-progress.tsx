import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isProfilePlaceholderValue } from "@/lib/profile";

type Step = { id: string; label: string; done: boolean };

export function ProfileSetupProgress({
  fullName,
  phone,
  defaultAddress,
  className,
}: {
  fullName?: string | null;
  phone?: string | null;
  defaultAddress?: string | null;
  className?: string;
}) {
  const steps: Step[] = [
    { id: "name", label: "Name", done: Boolean(fullName?.trim()) },
    { id: "phone", label: "Phone", done: !isProfilePlaceholderValue(phone) },
    { id: "address", label: "Service address", done: !isProfilePlaceholderValue(defaultAddress) },
  ];
  const completed = steps.filter((step) => step.done).length;

  return (
    <div className={cn("rounded-2xl border border-teal-100 bg-teal-50/80 p-4", className)}>
      <p className="text-xs font-bold uppercase tracking-[.14em] text-teal-800">Setup progress</p>
      <p className="mt-1 text-sm leading-6 text-teal-950/80">
        {completed} of {steps.length} complete — finish your profile to unlock Dashboard, Services, and My jobs.
      </p>
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        {steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
              step.done ? "bg-white text-teal-900 ring-1 ring-teal-100" : "bg-white/60 text-slate-600",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                step.done ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600",
              )}
              aria-hidden
            >
              {step.done ? <Check className="size-3.5" strokeWidth={3} /> : "·"}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
