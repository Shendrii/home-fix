"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/app-shell";
import { ProfileSetupProgress } from "@/components/profile-setup-progress";
import { InviteFriendsPanel } from "@/components/invite-friends-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatProfileTimestamp,
  hasProfileValidationErrors,
  profileFormDefaults,
  profileNeedsPersonalDetails,
  roleLabel,
  validateProfileUpdate,
  type Profile,
  type ProfileUpdateInput,
} from "@/lib/profile";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-4 py-3">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-600">
      {message}
    </p>
  );
}

export function AccountSettingsScreen() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileUpdateInput>({
    full_name: "",
    phone: "",
    default_address: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileUpdateInput, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileUpdateInput, boolean>>>({});

  const nameId = useId();
  const phoneId = useId();
  const addressId = useId();

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone, default_address, avatar_url, created_at, updated_at, email, referral_code")
      .eq("id", user.id)
      .single();
    if (error) {
      toast.error("Couldn’t load account details");
      setLoading(false);
      return;
    }
    const next = data as Profile;
    setProfile(next);
    setForm(profileFormDefaults(next));
    if (profileNeedsPersonalDetails(next)) {
      setEditing(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void (async () => {
      await loadProfile();
    })();
  }, [loadProfile]);

  function startEditing() {
    if (!profile) return;
    setForm(profileFormDefaults(profile));
    setErrors({});
    setTouched({});
    setEditing(true);
  }

  function cancelEditing() {
    if (profile) {
      setForm(profileFormDefaults(profile));
    }
    setErrors({});
    setTouched({});
    setEditing(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;

    setTouched({ full_name: true, phone: true, default_address: true });
    const nextErrors = validateProfileUpdate(form);
    setErrors(nextErrors);
    if (hasProfileValidationErrors(nextErrors)) return;

    const supabase = createClient();
    if (!supabase) return toast.error("Supabase is not configured");

    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      default_address: form.default_address.trim(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("id, full_name, role, phone, default_address, avatar_url, created_at, updated_at, email, referral_code")
      .single();
    setSaving(false);

    if (error) {
      toast.error("Couldn’t save changes", { description: error.message });
      return;
    }

    setProfile(data as Profile);
    const saved = data as Profile;
    const wasIncomplete = profileNeedsPersonalDetails(profile);
    const nowComplete = !profileNeedsPersonalDetails(saved);
    setEditing(false);
    setErrors({});
    await refresh();
    if (wasIncomplete && nowComplete) {
      toast.success("Profile complete — welcome to HomeFix!");
      router.push("/dashboard");
      router.refresh();
      return;
    }
    toast.success("Account updated");
  }

  if (loading) {
    return (
      <Card className="mx-auto max-w-2xl border-0 bg-card shadow-[0_16px_50px_rgba(30,41,59,.07)]">
        <CardContent className="py-10 text-center text-sm text-slate-500">Loading account…</CardContent>
      </Card>
    );
  }

  if (!profile || !user) {
    return (
      <Card className="mx-auto max-w-2xl border-0 bg-card">
        <CardContent className="py-10 text-center text-sm text-slate-500">Sign in to manage your account.</CardContent>
      </Card>
    );
  }

  const showError = (field: keyof ProfileUpdateInput) =>
    touched[field] ? errors[field] : undefined;
  const needsPersonalDetails = profileNeedsPersonalDetails(profile);

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={needsPersonalDetails ? "Complete your profile" : "Account settings"}
        description={
          needsPersonalDetails
            ? "We need your phone and default service address before you can book or browse jobs in the app."
            : "View and update your HomeFix profile. Role and sign-in email are managed by the platform."
        }
        action={
          editing && !needsPersonalDetails ? (
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={cancelEditing}>
              <X /> Cancel
            </Button>
          ) : !editing && !needsPersonalDetails ? (
            <Button type="button" className="h-11 rounded-xl" onClick={startEditing}>
              <Pencil /> Edit profile
            </Button>
          ) : null
        }
      />

      {needsPersonalDetails && (
        <ProfileSetupProgress
          className="mx-auto mb-6 max-w-2xl"
          fullName={profile.full_name}
          phone={profile.phone}
          defaultAddress={profile.default_address}
        />
      )}

      <Card className="mx-auto max-w-2xl border-0 bg-card shadow-[0_16px_50px_rgba(30,41,59,.07)]">
        <CardContent className="space-y-6 py-2 sm:py-4">
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Account information</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyRow label="Email" value={(profile.email?.trim() || user.email) ?? "—"} />
              <ReadOnlyRow label="Role" value={roleLabel(profile.role)} />
              <ReadOnlyRow label="Member since" value={formatProfileTimestamp(profile.created_at)} />
              <ReadOnlyRow label="Last updated" value={formatProfileTimestamp(profile.updated_at)} />
            </div>
          </section>

          <form onSubmit={save} noValidate className="space-y-5 border-t pt-6">
            <h2 className="text-sm font-bold text-slate-900">Profile details</h2>

            <div>
              {editing ? (
                <>
                  <label htmlFor={nameId} className="mb-2 block text-sm font-semibold text-slate-800">
                    Full name
                  </label>
                  <Input
                    id={nameId}
                    value={form.full_name}
                    aria-invalid={Boolean(showError("full_name"))}
                    aria-describedby={showError("full_name") ? `${nameId}-error` : undefined}
                    onBlur={() => setTouched((current) => ({ ...current, full_name: true }))}
                    onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                    className={cn("h-12 rounded-xl", showError("full_name") && "border-red-400")}
                  />
                  <FieldError id={`${nameId}-error`} message={showError("full_name")} />
                </>
              ) : (
                <ReadOnlyRow label="Full name" value={profile.full_name?.trim() || "—"} />
              )}
            </div>

            <div>
              {editing ? (
                <>
                  <label htmlFor={phoneId} className="mb-2 block text-sm font-semibold text-slate-800">
                    Phone
                  </label>
                  <Input
                    id={phoneId}
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    aria-invalid={Boolean(showError("phone"))}
                    aria-describedby={showError("phone") ? `${phoneId}-error` : undefined}
                    onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder={needsPersonalDetails ? "(415) 555-0142" : undefined}
                    className={cn("h-12 rounded-xl", showError("phone") && "border-red-400")}
                  />
                  <FieldError id={`${phoneId}-error`} message={showError("phone")} />
                </>
              ) : (
                <ReadOnlyRow label="Phone" value={profile.phone?.trim() || "—"} />
              )}
            </div>

            <div>
              {editing ? (
                <>
                  <label htmlFor={addressId} className="mb-2 block text-sm font-semibold text-slate-800">
                    Default service address
                  </label>
                  <Input
                    id={addressId}
                    autoComplete="street-address"
                    value={form.default_address}
                    aria-invalid={Boolean(showError("default_address"))}
                    aria-describedby={showError("default_address") ? `${addressId}-error` : undefined}
                    onBlur={() => setTouched((current) => ({ ...current, default_address: true }))}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, default_address: event.target.value }))
                    }
                    placeholder={needsPersonalDetails ? "Street, city, ZIP" : undefined}
                    className={cn("h-12 rounded-xl", showError("default_address") && "border-red-400")}
                  />
                  <FieldError id={`${addressId}-error`} message={showError("default_address")} />
                </>
              ) : (
                <ReadOnlyRow label="Default service address" value={profile.default_address?.trim() || "—"} />
              )}
            </div>

            {profile.avatar_url && (
              <ReadOnlyRow label="Avatar URL" value={profile.avatar_url} />
            )}

            {editing && (
              <div className="flex justify-end border-t pt-5">
                <Button type="submit" disabled={saving} className="h-11 rounded-xl">
                  {saving ? "Saving…" : needsPersonalDetails ? "Save and continue" : "Save changes"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {!needsPersonalDetails && profile.referral_code && <InviteFriendsPanel referralCode={profile.referral_code} />}
    </>
  );
}
