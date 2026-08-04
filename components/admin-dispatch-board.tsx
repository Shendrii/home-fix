"use client";

import Link from "next/link";
import { AlertTriangle, Radio, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";
import { AdminReassignDialog } from "@/components/admin-reassign-dialog";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge } from "@/components/screens";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function AdminDispatchBoard() {
  const { jobs } = useApp();
  const active = jobs.filter((job) => job.status === "open" || job.status === "assigned");

  async function runAction(jobId: string, action: "restart" | "broadcast") {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("admin_manage_dispatch", {
      p_request_id: jobId,
      p_action: action,
      p_company_id: null,
      p_reason: action === "restart" ? "Dispatch wave restarted by operations" : "Broadcast opened by operations",
    });
    if (error) {
      toast.error("Dispatch action failed", { description: error.message });
      return;
    }
    toast.success(action === "restart" ? "Offer wave restarted" : "Job is now broadcast");
  }

  return (
    <>
      <PageHeader
        eyebrow="Dispatch control"
        title="Live job dispatch"
        description="Monitor matching progress, resolve SLA risk, and intervene only when necessary."
      />
      <div className="grid gap-3">
        {active.map((job) => {
          const risk = job.urgency === "urgent" && job.status === "open";
          return (
            <Card key={job.id} className="border-0 bg-white">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={job.status} />
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {job.dispatchPhase?.replace("_", " ") ?? "matching"}
                    </span>
                    {risk && <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700"><AlertTriangle className="size-3.5" /> Urgent SLA risk</span>}
                  </div>
                  <p className="mt-3 font-bold text-slate-900">{job.title}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{job.referenceCode ?? job.id} · {job.address} · created {new Date(job.createdAt).toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Button variant="outline" size="sm" onClick={() => void runAction(job.id, "restart")}><RotateCcw /> Restart</Button>
                  <Button variant="outline" size="sm" onClick={() => void runAction(job.id, "broadcast")}><Radio /> Broadcast</Button>
                  <AdminReassignDialog jobId={job.id} categoryId={job.categoryId} />
                  <Button size="sm" render={<Link href={`/admin/jobs/${job.id}`}>Inspect</Link>} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!active.length && <Card><CardContent className="py-12 text-center text-sm text-slate-500">No active dispatches right now.</CardContent></Card>}
      </div>
    </>
  );
}
