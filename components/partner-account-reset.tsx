"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PartnerAccountReset() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);

  async function resetAccount() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return toast.error("Enter the partner email to remove.");
    if (!window.confirm(`Remove ${trimmed} and their company? They can be invited again as a new partner.`)) return;

    const supabase = createClient();
    const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
    if (!session) return toast.error("Your session has expired. Sign in again.");

    setWorking(true);
    const response = await fetch("/api/admin/partners/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: "include",
      body: JSON.stringify({ email: trimmed }),
    });
    const payload = await response.json() as { error?: string; status?: string; message?: string };
    setWorking(false);

    if (!response.ok) return toast.error(payload.error ?? "Unable to reset partner account.");
    toast.success("Partner account removed", {
      description: payload.message ?? "Send a new invitation when you are ready.",
    });
    setEmail("");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-3 rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
      <div>
        <p className="text-sm font-bold text-orange-950">Start over with an email</p>
        <p className="mt-1 text-xs leading-5 text-orange-900/80">
          Deletes their company, invitations, and login so you can invite them again. You cannot delete a profile
          in Supabase while a company still references it — use this instead.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="partner@example.com"
          className="h-11 bg-white"
          aria-label="Partner email to remove"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 border-orange-200 bg-white text-orange-950 hover:bg-orange-50"
          disabled={working || !email.trim()}
          onClick={() => void resetAccount()}
        >
          {working ? "Removing…" : "Remove partner account"}
        </Button>
      </div>
    </div>
  );
}
