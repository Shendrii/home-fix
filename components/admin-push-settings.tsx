"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Superadmin-only. The push-send endpoint is deployment-specific (there's
 * no fixed URL to hardcode in a migration), so it lives in `app_config` and
 * gets set here once the app is deployed somewhere Supabase's `pg_net`
 * trigger can reach.
 */
export function AdminPushSettings() {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.from("app_config").select("key, value").in("key", ["push_endpoint_url", "push_internal_secret"]);
      for (const row of data ?? []) {
        if (row.key === "push_endpoint_url") setEndpointUrl(row.value ?? "");
        if (row.key === "push_internal_secret") setSecret(row.value ?? "");
      }
      setLoaded(true);
    })();
  }, []);

  async function save() {
    const supabase = createClient();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("app_config").upsert([
      { key: "push_endpoint_url", value: endpointUrl.trim() || null },
      { key: "push_internal_secret", value: secret.trim() || null },
    ]);
    setSaving(false);
    if (error) {
      toast.error("Couldn’t save push settings", { description: error.message });
      return;
    }
    toast.success("Push settings saved");
  }

  if (!loaded) return null;

  return (
    <Card className="mt-6 border-0 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4 text-primary" /> Offer push notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-500">
          Leave blank to keep the offer-push trigger disabled (safe default — it silently no-ops otherwise). Set
          both once this app is deployed at a URL Supabase can reach.
        </p>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Push send endpoint</label>
          <Input
            value={endpointUrl}
            onChange={(event) => setEndpointUrl(event.target.value)}
            placeholder="https://your-domain.com/api/push/send"
            className="h-10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Shared secret (matches PUSH_INTERNAL_SECRET)</label>
          <Input
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Paste the same value as the PUSH_INTERNAL_SECRET env var"
            className="h-10"
          />
        </div>
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save push settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
