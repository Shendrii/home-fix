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

export function RequestForm({ initialService }: { initialService?: string }) {
  const { categories, createJob } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [service, setService] = useState(initialService ?? "");
  const [description, setDescription] = useState("");
  const [addressValue, setAddressValue] = useState<ServiceAddressValue>(emptyAddress);
  const [windowState, setWindowState] = useState<PreferredWindowState>(() => defaultPreferredWindow());
  const [urgency, setUrgency] = useState<"standard" | "urgent">("standard");

  const preferredDate = useMemo(() => formatPreferredWindow(windowState), [windowState]);
  const resolvedServiceId = useMemo(
    () => resolveServiceCategoryId(categories, service),
    [categories, service],
  );
  const stepThreeValid =
    addressValue.confirmed &&
    !!addressValue.address.trim() &&
    addressValue.lat != null &&
    addressValue.lng != null &&
    isPreferredWindowValid(windowState) &&
    !!preferredDate;

  const valid = step === 1 ? !!resolvedServiceId : step === 2 ? description.trim().length >= 10 : stepThreeValid;

  const submit = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured", { description: "Add your local environment values before sending requests." });
      return;
    }
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
    }
  };

  const selectedCategory = categories.find((category) => category.id === resolvedServiceId);

  return <>
    <PageHeader eyebrow={`Step ${step} of 3`} title={step === 1 ? "What needs attention?" : step === 2 ? "Tell us what’s happening" : "When and where?"} description="A few clear details help us find the right professional." />
    <Progress value={step * 33.33} className="mb-6 h-2" />
    {step > 1 && selectedCategory && (
      <div className="mx-auto mb-5 flex max-w-3xl items-center justify-between rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Rough price estimate</p>
          <p className="mt-0.5 text-sm text-teal-900">{selectedCategory.name} typically starts around this range.</p>
        </div>
        <p className="text-xl font-bold text-teal-900">${selectedCategory.startingPrice}<span className="text-xs font-normal text-teal-700">+</span></p>
      </div>
    )}
    <Card className="mx-auto max-w-3xl border-0 bg-white shadow-[0_16px_50px_rgba(30,41,59,.07)]">
      <CardContent className="py-2 sm:py-4">
        {step === 1 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{categories.filter((c) => c.active).map((category) => <button key={category.id} onClick={() => setService(category.id)} className={`min-h-28 rounded-2xl border-2 p-3 text-left transition-colors ${resolvedServiceId === category.id ? "border-teal-600 bg-teal-50" : "border-slate-100 hover:border-slate-200"}`}><span className={`mb-3 grid size-9 place-items-center rounded-xl ${category.color}`}><Check className={`size-4 ${resolvedServiceId === category.id ? "opacity-100" : "opacity-20"}`} /></span><p className="text-sm font-bold">{category.name}</p><p className="mt-1 text-xs text-slate-400">From ${category.startingPrice}</p></button>)}</div>}
        {step === 2 && <div className="space-y-5"><div><label htmlFor="description" className="mb-2 block text-sm font-semibold">Describe the issue</label><Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-36 resize-none rounded-2xl" placeholder="What happened, where is it, and when did you first notice it?" /><p className="mt-2 text-xs text-slate-400">At least 10 characters · photos can be added after matching.</p></div><div><p className="mb-2 text-sm font-semibold">How urgent is it?</p><div className="grid grid-cols-2 gap-3">{(["standard", "urgent"] as const).map((value) => <button key={value} onClick={() => setUrgency(value)} className={`tap-target rounded-2xl border-2 px-4 text-left capitalize ${urgency === value ? "border-teal-600 bg-teal-50" : "border-slate-100"}`}><span className="font-semibold">{value}</span><span className="block text-xs normal-case text-slate-400">{value === "standard" ? "Within a few days" : "As soon as possible"}</span></button>)}</div></div></div>}
        {step === 3 && (
          <div className="space-y-6">
            <ServiceAddressPicker value={addressValue} onChange={setAddressValue} />
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="size-4 text-teal-700" aria-hidden="true" />
                Preferred window
              </p>
              <PreferredWindowPicker value={windowState} onChange={setWindowState} />
            </div>
            <div className="flex gap-3 rounded-2xl bg-teal-50 p-4">
              <ShieldCheck className="size-5 shrink-0 text-teal-700" aria-hidden="true" />
              <p className="text-sm leading-6 text-teal-900">You won’t be charged now. A professional will confirm scope and final pricing before work begins.</p>
            </div>
          </div>
        )}
        <div className="mt-7 flex items-center justify-between border-t pt-5">
          <Button variant="ghost" disabled={step === 1} onClick={() => setStep((current) => current - 1)} className="h-11"><ArrowLeft /> Back</Button>
          {step < 3 ? <Button disabled={!valid} onClick={() => setStep((current) => current + 1)} className="h-11">Continue <ArrowRight /></Button> : <Button disabled={!valid} onClick={submit} className="h-11">Send request <ArrowRight /></Button>}
        </div>
      </CardContent>
    </Card>
  </>;
}
