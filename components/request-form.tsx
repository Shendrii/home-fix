"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/app-shell";
import { PreferredWindowPicker } from "@/components/preferred-window-picker";
import { ServiceAddressPicker, type ServiceAddressValue } from "@/components/service-address-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultPreferredWindow,
  formatPreferredWindow,
  isPreferredWindowValid,
  preferredWindowBounds,
  type PreferredWindowState,
} from "@/lib/preferred-window";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveServiceCategoryId } from "@/lib/service-category";

const emptyAddress: ServiceAddressValue = {
  address: "",
  lat: null,
  lng: null,
  confirmed: false,
};

const choiceClass = (selected: boolean) =>
  `min-h-28 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring ${
    selected ? "border-primary bg-secondary" : "border-border bg-card hover:bg-muted"
  }`;

export function RequestForm({ initialService }: { initialService?: string }) {
  const { categories, createJob } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [service, setService] = useState(initialService ?? "");
  const [description, setDescription] = useState("");
  const [addressValue, setAddressValue] = useState<ServiceAddressValue>(emptyAddress);
  const [windowState, setWindowState] = useState<PreferredWindowState>(() => defaultPreferredWindow());
  const [urgency, setUrgency] = useState<"standard" | "urgent">("standard");
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const preferredDate = useMemo(() => formatPreferredWindow(windowState), [windowState]);
  const resolvedServiceId = useMemo(
    () => resolveServiceCategoryId(categories, service),
    [categories, service],
  );
  const activeCategories = categories.filter((category) => category.active);
  const stepThreeValid =
    addressValue.confirmed &&
    !!addressValue.address.trim() &&
    addressValue.lat != null &&
    addressValue.lng != null &&
    isPreferredWindowValid(windowState) &&
    !!preferredDate;

  const valid = step === 1 ? !!resolvedServiceId : step === 2 ? description.trim().length >= 10 : stepThreeValid;
  const selectedCategory = categories.find((category) => category.id === resolvedServiceId);

  function invalidMessage() {
    if (step === 1) return "Choose a service to continue.";
    if (step === 2) return "Describe the issue in at least 10 characters.";
    return "Confirm the address and a valid time window before sending.";
  }

  function advance() {
    if (!valid) {
      setStepError(invalidMessage());
      return;
    }
    setStepError(null);
    setStep((current) => current + 1);
  }

  async function submit() {
    if (!valid) {
      setStepError(invalidMessage());
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured", { description: "Add your local environment values before sending requests." });
      return;
    }
    setSubmitting(true);
    try {
      const { startAt, endAt } = preferredWindowBounds(windowState);
      const job = await createJob({
        categoryId: resolvedServiceId!,
        description,
        address: addressValue.address,
        preferredDate,
        urgency,
        latitude: addressValue.lat!,
        longitude: addressValue.lng!,
        preferredStartAt: startAt,
        preferredEndAt: endAt,
      });
      toast.success("Request sent", { description: "We’re matching you with trusted local professionals." });
      router.push(`/jobs/${job.id}`);
    } catch (error) {
      toast.error("Couldn’t send request", { description: error instanceof Error ? error.message : "Try again shortly." });
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Step ${step} of 3`}
        title={step === 1 ? "What needs attention?" : step === 2 ? "Tell us what’s happening" : "When and where?"}
        description="A few clear details help us find the right professional."
      />
      <Progress value={step * 33.33} aria-label={`Step ${step} of 3`} className="mb-6 h-2" />
      {step > 1 && selectedCategory && (
        <div className="mx-auto mb-5 flex max-w-3xl items-center justify-between gap-4 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Rough price estimate</p>
            <p className="mt-0.5 text-sm">{selectedCategory.name} typically starts around this range.</p>
          </div>
          <p className="shrink-0 text-xl font-bold tabular-nums">
            ${selectedCategory.startingPrice}
            <span className="text-xs font-normal">+</span>
          </p>
        </div>
      )}
      <Card className="mx-auto max-w-3xl border-0 bg-card shadow-[0_16px_50px_oklch(0.24_0.045_245/0.07)]">
        <CardContent className="py-2 sm:py-4">
          {step === 1 && (
            activeCategories.length ? (
              <div role="group" aria-label="Service" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activeCategories.map((category) => {
                  const selected = resolvedServiceId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setService(category.id);
                        setStepError(null);
                      }}
                      className={choiceClass(selected)}
                    >
                      <span className={`mb-3 grid size-9 place-items-center rounded-xl ${category.color}`}>
                        <Check className={`size-4 ${selected ? "opacity-100" : "opacity-20"}`} aria-hidden="true" />
                      </span>
                      <p className="text-sm font-bold">{category.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">From ${category.startingPrice}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No services are available right now. Try again shortly.
              </p>
            )
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold">Describe the issue</label>
                <Textarea
                  id="description"
                  name="description"
                  autoComplete="off"
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setStepError(null);
                  }}
                  className="min-h-36 resize-none rounded-2xl"
                  placeholder="What happened, where it is, and when you first noticed it…"
                />
                <p className="mt-2 text-xs text-muted-foreground">At least 10 characters. Photos can be added after matching.</p>
              </div>
              <div role="group" aria-label="How urgent is it?" className="grid grid-cols-2 gap-3">
                {(["standard", "urgent"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={urgency === value}
                    onClick={() => setUrgency(value)}
                    className={`tap-target rounded-2xl border-2 px-4 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring ${
                      urgency === value ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="font-semibold">{value === "standard" ? "Standard" : "Urgent"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {value === "standard" ? "Within a few days" : "As soon as possible"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <ServiceAddressPicker value={addressValue} onChange={setAddressValue} />
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                  Preferred window
                </p>
                <PreferredWindowPicker value={windowState} onChange={setWindowState} />
              </div>
              <div className="flex gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground">
                <ShieldCheck className="size-5 shrink-0" aria-hidden="true" />
                <p className="text-sm leading-6">You won’t be charged now. A professional will confirm scope and final pricing before work begins.</p>
              </div>
            </div>
          )}
          {stepError && (
            <p role="alert" className="mt-4 text-sm text-destructive">{stepError}</p>
          )}
          <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 1 || submitting}
              onClick={() => {
                setStepError(null);
                setStep((current) => current - 1);
              }}
              className="h-11"
            >
              <ArrowLeft aria-hidden="true" /> Back
            </Button>
            {step < 3 ? (
              <Button type="button" disabled={submitting} onClick={advance} className="h-11">
                Continue <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" disabled={submitting} onClick={() => void submit()} className="h-11">
                {submitting ? "Sending…" : "Send request"} {!submitting && <ArrowRight aria-hidden="true" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
