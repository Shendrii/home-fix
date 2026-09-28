"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { User } from "@/lib/types";

export function AdminUserEditor({
  user,
  onSaved,
}: {
  user: User;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user.name);
    setPhone(user.phone);
    setAddress(user.address);
  }, [open, user]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        full_name: name,
        phone,
        default_address: address,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) {
      toast.error("Couldn’t update user", { description: payload?.error ?? "Try again in a moment." });
      return;
    }
    toast.success("User profile updated");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil /> Edit
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Edit user profile</DialogTitle>
            <DialogDescription>
              Update profile details only. Their sign-in email and role are managed separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label htmlFor={`user-name-${user.id}`} className="mb-1.5 block text-sm font-semibold">Full name</label>
              <Input id={`user-name-${user.id}`} value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div>
              <label htmlFor={`user-phone-${user.id}`} className="mb-1.5 block text-sm font-semibold">Phone</label>
              <Input id={`user-phone-${user.id}`} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </div>
            <div>
              <label htmlFor={`user-address-${user.id}`} className="mb-1.5 block text-sm font-semibold">Default address</label>
              <Input id={`user-address-${user.id}`} value={address} onChange={(event) => setAddress(event.target.value)} required />
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
