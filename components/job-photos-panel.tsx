"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, ImageOff, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MediaKind = "request" | "before" | "after" | "general";

type MediaRow = {
  id: string;
  storage_path: string;
  file_name: string;
  kind: MediaKind;
  created_at: string;
};

type MediaItem = MediaRow & { url: string | null };

const KIND_LABELS: Record<MediaKind, string> = {
  request: "Request photo",
  before: "Before",
  after: "After",
  general: "Photo",
};

/** Shorter labels for upload buttons */
const UPLOAD_BUTTON_LABEL: Record<MediaKind, string> = {
  request: "photo",
  before: "before",
  after: "after",
  general: "photo",
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Shared photo surface for `request_attachments` (bucket: job-media). One
 * component serves homeowner request photos, partner before/after photos,
 * and the client-facing job-history view — access is enforced by RLS, this
 * component only decides which upload affordances to show.
 */
export function JobPhotosPanel({
  jobId,
  title = "Photos",
  uploadKinds = [],
  emptyLabel = "No photos yet.",
}: {
  jobId: string;
  title?: string;
  /** Kinds this viewer is allowed to upload. Empty = read-only. */
  uploadKinds?: MediaKind[];
  emptyLabel?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<MediaKind | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("request_attachments")
      .select("id, storage_path, file_name, kind, created_at")
      .eq("service_request_id", jobId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as MediaRow[];
    if (!rows.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("job-media")
      .createSignedUrls(
        rows.map((row) => row.storage_path),
        60 * 60,
      );
    const urlByPath = new Map<string, string | null>(
      (signed ?? [])
        .filter((entry: { path: string | null }) => entry.path)
        .map((entry: { path: string | null; signedUrl?: string }) => [
          entry.path as string,
          entry.signedUrl ?? null,
        ]),
    );
    setItems(rows.map((row) => ({ ...row, url: urlByPath.get(row.storage_path) ?? null })));
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function upload(kind: MediaKind, files: FileList | null) {
    if (!files?.length) return;
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(kind);
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is too large`, { description: "Photos must be under 8MB." });
        continue;
      }
      const path = `${jobId}/${kind}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("job-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        toast.error("Upload failed", { description: uploadError.message });
        continue;
      }
      const { error: insertError } = await supabase.from("request_attachments").insert({
        service_request_id: jobId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        kind,
        created_by: user.id,
      });
      if (insertError) {
        toast.error("Couldn’t save photo", { description: insertError.message });
      }
    }
    setUploading(null);
    void load();
  }

  return (
    <Card className="border-0 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="size-4 text-teal-700" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadKinds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadKinds.map((kind) => (
              <label
                key={kind}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-teal-200 px-3 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50"
              >
                {uploading === kind ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Add {UPLOAD_BUTTON_LABEL[kind]}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(event) => void upload(kind, event.target.files)}
                />
              </label>
            ))}
          </div>
        )}
        {loading && <p className="text-sm text-slate-400">Loading photos…</p>}
        {!loading && !items.length && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            <ImageOff className="size-4" /> {emptyLabel}
          </div>
        )}
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-xl border border-slate-100">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.file_name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center bg-slate-100 text-xs text-slate-400">
                    Unavailable
                  </div>
                )}
                <p className="border-t border-slate-100 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {KIND_LABELS[item.kind]}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
