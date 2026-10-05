"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ReferralRow = { id: string; status: string; created_at: string; referred_user_id: string };

/**
 * Attribution only — no credit or discount is granted here. If/when
 * incentives are built, they need a payments/credits primitive to hang off
 * of; this panel intentionally stops at "here's who you invited."
 */
export function InviteFriendsPanel({ referralCode }: { referralCode: string }) {
  const [referrals, setReferrals] = useState<(ReferralRow & { name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const link = typeof window !== "undefined" ? `${window.location.origin}/auth/sign-up?ref=${referralCode}` : "";

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: rows } = await supabase
        .from("referrals")
        .select("id, status, created_at, referred_user_id")
        .order("created_at", { ascending: false });
      const list = (rows ?? []) as ReferralRow[];
      if (!list.length) {
        setReferrals([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", list.map((row) => row.referred_user_id));
      const nameById = new Map<string, string>(
        (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "HomeFix user"]),
      );
      setReferrals(list.map((row) => ({ ...row, name: nameById.get(row.referred_user_id) ?? "HomeFix user" })));
      setLoading(false);
    })();
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="mx-auto mt-6 max-w-2xl border-0 bg-card shadow-[0_16px_50px_rgba(30,41,59,.07)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="size-4 text-primary" /> Invite friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share your link. We track who signs up through it — there’s no reward program yet, but we’ll let you know
          if that changes.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={link} className="h-11 rounded-xl" />
          <Button variant="outline" className="h-11 shrink-0 rounded-xl" onClick={() => void copyLink()}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="border-t pt-4">
          <p className="mb-2 text-sm font-semibold text-muted-foreground">
            {referrals.length} referral{referrals.length === 1 ? "" : "s"}
          </p>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && !referrals.length && (
            <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">No one has signed up with your link yet.</p>
          )}
          <div className="space-y-2">
            {referrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
                <span className="font-semibold text-foreground">{referral.name}</span>
                <span className="text-xs text-muted-foreground">{new Date(referral.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
