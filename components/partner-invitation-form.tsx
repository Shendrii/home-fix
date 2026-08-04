"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PartnerInvitationForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured.");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return toast.error("Your session has expired. Sign in again.");

    setSending(true);
    try {
      const response = await fetch("/api/admin/partners/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          company_name: companyName,
          phone,
          service_area: serviceArea,
          company_description: description,
          service_category_ids: selected,
        }),
      });

      let payload: { error?: string; message?: string; status?: string; emailSent?: boolean } = {};
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        payload = { error: "Unexpected server response. Check the terminal logs." };
      }

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to send invitation.");
        return;
      }

      if (payload.status === "invitation_email_sent") {
        toast.success("Signup invite emailed", {
          description:
            payload.message ??
            "They must accept the Supabase email to create their account and company.",
        });
      } else if (payload.status === "provisioned") {
        toast.success(payload.emailSent ? "Company linked — sign-in email sent" : "Company linked", {
          description: payload.message,
        });
      } else if (payload.status === "already_provisioned") {
        toast.message("Already a partner", { description: payload.message });
      } else {
        toast.success("Invitation saved", { description: payload.message });
      }

      setEmail("");
      setCompanyName("");
      setPhone("");
      setServiceArea("");
      setDescription("");
      setSelected([]);
      router.refresh();
    } catch (error) {
      toast.error("Network error", {
        description: error instanceof Error ? error.message : "Could not reach the invite API.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        <strong className="text-slate-800">When is email sent?</strong> Only when the owner email has never
        signed up on HomeFix. If they already have an account (including Google), we create the company
        immediately and they sign in — no invite email.
      </p>
      <div>
        <label className="text-sm font-semibold">Company name</label>
        <Input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-2 h-11" />
      </div>
      <div>
        <label className="text-sm font-semibold">Owner email</label>
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 h-11" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Business phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 h-11" />
        </div>
        <div>
          <label className="text-sm font-semibold">Service area</label>
          <Input
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            className="mt-2 h-11"
            placeholder="e.g. Manila"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold">Company description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 h-11" />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Verified services</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(category.id)}
                onChange={() =>
                  setSelected((all) =>
                    all.includes(category.id) ? all.filter((id) => id !== category.id) : [...all, category.id],
                  )
                }
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={sending || !selected.length} className="w-full">
        {sending ? "Sending…" : "Send secure invitation"}
      </Button>
    </form>
  );
}
