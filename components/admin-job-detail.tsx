"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Radio, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useApp } from "@/components/app-provider";
import { AdminReassignDialog } from "@/components/admin-reassign-dialog";
import { JobNotesPanel } from "@/components/job-notes-panel";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge } from "@/components/screens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type HistoryEvent = { id: string; status: string; note: string | null; created_at: string; metadata: Record<string, unknown> | null };

export function AdminJobDetail({ id }: { id: string }) {
  const { jobs } = useApp();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const job = jobs.find((item) => item.id === id);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("request_status_history")
        .select("id, status, note, created_at, metadata")
        .eq("service_request_id", id)
        .order("created_at");
      setHistory((data ?? []) as HistoryEvent[]);
    })();
  }, [id]);

  async function manage(action: "restart" | "broadcast" | "cancel") {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("admin_manage_dispatch", {
      p_request_id: id,
      p_action: action,
      p_company_id: null,
      p_reason: `Operations action: ${action}`,
    });
    if (error) return toast.error("Action failed", { description: error.message });
    toast.success(`Dispatch ${action} complete`);
  }

  if (!job) return <Card><CardContent className="py-10"><p className="font-semibold">Job not found or unavailable.</p><Button variant="outline" className="mt-4" render={<Link href="/admin/jobs"><ArrowLeft /> Back to dispatch</Link>} /></CardContent></Card>;

  return (
    <>
      <PageHeader
        eyebrow={job.referenceCode ?? job.id}
        title={job.title}
        description={`${job.address} · ${job.urgency} request`}
        action={<StatusBadge status={job.status} />}
      />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Card className="border-0 bg-white">
          <CardHeader><CardTitle>Dispatch timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm"><span className="font-semibold">Current phase: </span>{job.dispatchPhase?.replace("_", " ") ?? "matching"}</div>
            {history.map((event) => <div key={event.id} className="border-l-2 border-teal-200 pl-4"><p className="font-semibold capitalize">{event.status.replace("_", " ")}</p><p className="mt-1 text-sm text-slate-600">{event.note ?? "Status updated"}</p><p className="mt-1 text-xs text-slate-400">{new Date(event.created_at).toLocaleString()}</p></div>)}
            {!history.length && <p className="text-sm text-slate-500">History will appear as matching and field-work events occur.</p>}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="border-0 bg-white"><CardHeader><CardTitle>Operations actions</CardTitle></CardHeader><CardContent className="space-y-3"><Button variant="outline" className="w-full" onClick={() => void manage("restart")}><RotateCcw /> Restart qualified wave</Button><Button variant="outline" className="w-full" onClick={() => void manage("broadcast")}><Radio /> Open broadcast queue</Button><AdminReassignDialog jobId={job.id} categoryId={job.categoryId} triggerLabel="Manually reassign" triggerVariant="outline" triggerClassName="w-full" /><Button variant="destructive" className="w-full" onClick={() => void manage("cancel")}>Cancel request</Button></CardContent></Card>
          <Card className="border-0 bg-white"><CardContent className="space-y-2 text-sm"><p><span className="text-slate-400">Preferred window</span><br />{job.preferredDate}</p><p><span className="text-slate-400">Estimated value</span><br />${job.budget}</p><p><span className="text-slate-400">Assigned company</span><br />{job.companyId ?? "Not assigned"}</p></CardContent></Card>
          <JobNotesPanel jobId={job.id} />
        </div>
      </div>
    </>
  );
}
