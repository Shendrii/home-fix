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
    <div className={cn("rounded-2xl border border-border bg-secondary p-4", className)}>
      <p className="text-sm font-semibold text-primary">Setup progress</p>
      <p className="mt-1 text-sm leading-6 text-foreground/80">
        {completed} of {steps.length} complete. Finish your profile to unlock Dashboard, Services, and My jobs.
      </p>
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        {steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
              step.done ? "bg-card text-foreground ring-1 ring-border" : "bg-white/60 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
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
