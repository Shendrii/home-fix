"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTimestamp } from "@/lib/format-timestamp";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type JobNote = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
};

/**
 * Append-only field notes/checklist for a job — parts used, time spent, anything
 * worth recording while on site. Visible to the assigned partner and operations;
 * intentionally separate from the client-facing job description and the
 * status-history audit trail.
 */
export function JobNotesPanel({ jobId }: { jobId: string }) {
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("job_notes")
        .select("id, body, created_at, author_id")
        .eq("service_request_id", jobId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setNotes((data ?? []) as JobNote[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function addNote() {
    const body = draft.trim();
    if (!body) return;
    const supabase = createClient();
    if (!supabase) return;
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase
      .from("job_notes")
      .insert({ service_request_id: jobId, author_id: user.id, body })
      .select("id, body, created_at, author_id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("Couldn’t save note", { description: error.message });
      return;
    }
    setNotes((current) => [data as JobNote, ...current]);
    setDraft("");
  }

  return (
    <Card className="border-0 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" /> Field notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Parts used, time spent, anything worth remembering about this visit…"
            className="min-h-20 rounded-xl"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!draft.trim() || submitting}
            onClick={() => void addNote()}
          >
            <Plus /> {submitting ? "Saving…" : "Add note"}
          </Button>
        </div>
        <div className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading notes…</p>}
          {!loading && !notes.length && (
            <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
              No field notes yet.
            </p>
          )}
          {notes.map((note) => (
            <div key={note.id} className="rounded-xl border border-border p-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{note.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatRelativeTimestamp(note.created_at)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
