"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ServiceFeedback({ jobId, companyId }: { jobId: string; companyId: string }) {
  const { actingAs } = useApp();
  const [rating, setRating] = useState(0);
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [wentWell, setWentWell] = useState("");
  const [improve, setImprove] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    void supabase
      .from("reviews")
      .select("id")
      .eq("service_request_id", jobId)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (!active) return;
        setSent(Boolean(data));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!rating || recommend === null) return;
    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured.");
    setSaving(true);
    const { error } = await supabase.rpc("submit_service_feedback", {
      p_request_id: jobId,
      p_rating: rating,
      p_would_recommend: recommend,
      p_went_well: wentWell.trim() || null,
      p_improve: improve.trim() || null,
      p_client_id: actingAs?.role === "client" ? actingAs.userId : null,
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn’t save feedback", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Thanks, that helps.");
  }

  if (!companyId || loading) return null;
  if (sent) {
    return (
      <Card className="border-0 bg-card">
        <CardContent className="py-6">
          <p className="font-semibold text-foreground">Thanks for the note</p>
          <p className="mt-1 text-sm text-muted-foreground">Your feedback is saved with this job.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-card">
      <CardContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">How was the visit?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Four quick answers. We already know the job.</p>
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Overall experience</legend>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} out of 5`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                  className="grid size-11 place-items-center rounded-xl hover:bg-amber-50"
                >
                  <Star className={cn("size-6", value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Would you recommend HomeFix?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                [true, "Yes"],
                [false, "No"],
              ] as const).map(([value, label]) => (
                <label
                  key={label}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold",
                    recommend === value ? "border-primary bg-secondary text-foreground" : "border-border text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="recommend"
                    className="sr-only"
                    checked={recommend === value}
                    onChange={() => setRecommend(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="went-well">What did we do well?</label>
            <Textarea id="went-well" value={wentWell} onChange={(event) => setWentWell(event.target.value)} className="mt-2" placeholder="Optional" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="improve">What should we improve?</label>
            <Textarea id="improve" value={improve} onChange={(event) => setImprove(event.target.value)} className="mt-2" placeholder="Optional" />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={saving || !rating || recommend === null}>
            {saving ? "Saving…" : "Send feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
