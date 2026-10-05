"use client";

import { useEffect, useState } from "react";
import { Building2, BriefcaseBusiness, Users } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell";
import { AdminPushSettings } from "@/components/admin-push-settings";

type Metrics = Record<string, number>;
type Activity = { company_name?: string; company_id?: string; active_jobs?: number; completed_jobs?: number };

export function AdminMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [dispatch, setDispatch] = useState({ pendingOffers: 0, broadcastJobs: 0 });
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const load = async () => {
      const [metricResult, activityResult, offersResult, broadcastResult] = await Promise.all([
        supabase.rpc("admin_marketplace_metrics"),
        supabase.rpc("admin_partner_activity"),
        supabase.from("dispatch_offers").select("id", { count: "exact", head: true }).in("status", ["pending", "viewed"]),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "open").eq("dispatch_phase", "broadcast"),
      ]);
      if (!metricResult.error) setMetrics(((metricResult.data as Metrics[] | null)?.[0] ?? {}) as Metrics);
      if (!activityResult.error) setActivity((activityResult.data ?? []) as Activity[]);
      setDispatch({
        pendingOffers: offersResult.count ?? 0,
        broadcastJobs: broadcastResult.count ?? 0,
      });
    };
    void load();
    const channel = supabase.channel("admin-service-requests").on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);
  const cards = [
    ["Unaccepted requests", metrics?.unaccepted_requests ?? 0, BriefcaseBusiness],
    ["Urgent unmatched", metrics?.urgent_unmatched_requests ?? metrics?.urgent_unaccepted_requests ?? 0, BriefcaseBusiness],
    ["Offers awaiting response", dispatch.pendingOffers, BriefcaseBusiness],
    ["Broadcast jobs", dispatch.broadcastJobs, BriefcaseBusiness],
    ["Active jobs", metrics?.active_jobs ?? 0, BriefcaseBusiness],
    ["Pending jobs", metrics?.pending_jobs ?? 0, BriefcaseBusiness],
    ["Completed jobs", metrics?.completed_jobs ?? 0, BriefcaseBusiness],
    ["Clients", metrics?.client_count ?? 0, Users],
    ["Partners", metrics?.partner_count ?? 0, Users],
    ["Companies", metrics?.company_count ?? 0, Building2],
  ] as const;
  return <><PageHeader eyebrow="Operations center" title="Marketplace health" description={isSupabaseConfigured ? "Live marketplace activity refreshes as requests change." : "Connect Supabase to view live operational metrics."} /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label} className="border-0 bg-card"><CardContent><Icon className="size-5 text-primary" /><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div><Card className="mt-6 border-0 bg-card"><CardHeader><CardTitle>Partner activity</CardTitle></CardHeader><CardContent className="space-y-3">{activity.length ? activity.map((item) => <div key={item.company_id} className="flex justify-between rounded-xl bg-muted p-3 text-sm"><span className="font-semibold">{item.company_name ?? "Service partner"}</span><span className="text-muted-foreground">{item.active_jobs ?? 0} active · {item.completed_jobs ?? 0} completed</span></div>) : <p className="text-sm text-muted-foreground">{isSupabaseConfigured ? "No partner activity yet." : "Metrics appear once Supabase is configured."}</p>}</CardContent></Card><AdminPushSettings /></>;
}
