"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ViewAsButton({
  companyId,
  userId,
  label = "View as",
}: {
  companyId?: string;
  userId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    const response = await fetch("/api/admin/view-as", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(companyId ? { companyId } : { userId }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; redirectTo?: string } | null;
    if (!response.ok || !payload?.redirectTo) {
      toast.error("Couldn’t open that workspace", { description: payload?.error ?? "Try again in a moment." });
      setPending(false);
      return;
    }
    router.push(payload.redirectTo);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => void start()}>
      {pending ? "Opening…" : label}
    </Button>
  );
}

export function ExitViewAsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function exit() {
    setPending(true);
    await fetch("/api/admin/view-as", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="shrink-0 text-sm font-semibold text-primary hover:text-primary disabled:opacity-60"
      disabled={pending}
      onClick={() => void exit()}
    >
      {pending ? "Exiting…" : "Exit"}
    </button>
  );
}
