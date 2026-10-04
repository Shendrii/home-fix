"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function PartnerInvitationForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function sessionOrToast() {
    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return null;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Your session has expired. Sign in again.");
      return null;
    }
    return session;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const session = await sessionOrToast();
    if (!session) return;

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
          description: payload.message ?? "They must accept the email to create their account and company.",
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

  async function removeAccount() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return toast.error("Enter the partner email above first.");
    if (!window.confirm(`Remove ${trimmed} and their company? You can invite that email again afterward.`)) return;

    const session = await sessionOrToast();
    if (!session) return;

    setRemoving(true);
    try {
      const response = await fetch("/api/admin/partners/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({ email: trimmed }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Unable to remove partner account.");
        return;
      }
      toast.success("Partner account removed", {
        description: payload.message ?? "You can send a new invitation for this email.",
      });
      router.refresh();
    } catch (error) {
      toast.error("Network error", {
        description: error instanceof Error ? error.message : "Could not reach the reset API.",
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Company</h2>
          <p className="mt-1 text-sm text-slate-500">The business homeowners will see.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="company-name">Company name</label>
          <Input id="company-name" required value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-2 h-11" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="company-description">Description</label>
          <Textarea
            id="company-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 min-h-20"
            placeholder="Optional. A short line about the work they do."
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Partner</h2>
          <p className="mt-1 text-sm text-slate-500">This person becomes the company’s first admin.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor="partner-email">Email</label>
          <Input
            id="partner-email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11"
            placeholder="name@company.com"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            A new address gets a signup email. An existing HomeFix login is linked right away.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="partner-phone">Phone</label>
            <Input id="partner-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 h-11" placeholder="Optional" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="partner-area">Service area</label>
            <Input
              id="partner-area"
              value={serviceArea}
              onChange={(event) => setServiceArea(event.target.value)}
              className="mt-2 h-11"
              placeholder="e.g. Manila"
            />
          </div>
        </div>
      </section>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Services</legend>
        <p className="mt-1 text-sm text-slate-500">Choose the work this company is verified to accept.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {categories.map((category) => {
            const active = selected.includes(category.id);
            return (
              <label
                key={category.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                  active ? "border-primary bg-secondary text-foreground" : "border-slate-200 text-slate-700 hover:border-slate-300",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={active}
                  onChange={() =>
                    setSelected((all) =>
                      all.includes(category.id) ? all.filter((id) => id !== category.id) : [...all, category.id],
                    )
                  }
                />
                {category.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-4 border-t border-slate-100 pt-6">
        <Button type="submit" disabled={sending || removing || !selected.length} className="h-11 w-full">
          {sending ? "Sending…" : "Send invitation"}
        </Button>
        <p className="text-center text-sm text-slate-500">
          Need to invite this email again?{" "}
          <button
            type="button"
            className="font-semibold text-slate-800 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            disabled={removing || sending || !email.trim()}
            onClick={() => void removeAccount()}
          >
            {removing ? "Removing…" : "Remove partner account"}
          </button>
        </p>
      </div>
    </form>
  );
}
