import type { Role } from "@/lib/types";

/** Profile row fields used across the app shell and account settings. */
export type Profile = {
  id: string;
  email?: string | null;
  full_name: string | null;
  role: Role;
  phone?: string | null;
  default_address?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  referral_code?: string | null;
};

export type ProfileUpdateInput = {
  full_name: string;
  phone: string;
  default_address: string;
};

export function roleLabel(role: Role) {
  if (role === "client") return "Homeowner";
  if (role === "partner") return "Service partner";
  if (role === "superadmin") return "Super admin";
  return "Operations";
}

export function formatProfileTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function validateProfileUpdate(input: ProfileUpdateInput) {
  const errors: Partial<Record<keyof ProfileUpdateInput, string>> = {};
  if (!input.full_name.trim()) errors.full_name = "Name is required.";
  if (isProfilePlaceholderValue(input.phone)) errors.phone = "Phone is required.";
  if (isProfilePlaceholderValue(input.default_address)) {
    errors.default_address = "Default address is required.";
  }
  return errors;
}

export function hasProfileValidationErrors(errors: Partial<Record<keyof ProfileUpdateInput, string>>) {
  return Object.keys(errors).length > 0;
}

export const PROFILE_PLACEHOLDER = "Pending update";

export function isProfilePlaceholderValue(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return !trimmed || trimmed === PROFILE_PLACEHOLDER;
}

export function profileFormDefaults(profile: {
  full_name?: string | null;
  phone?: string | null;
  default_address?: string | null;
}): ProfileUpdateInput {
  const phone = profile.phone?.trim() ?? "";
  const address = profile.default_address?.trim() ?? "";
  return {
    full_name: profile.full_name?.trim() ?? "",
    phone: isProfilePlaceholderValue(phone) ? "" : phone,
    default_address: isProfilePlaceholderValue(address) ? "" : address,
  };
}

export function profileNeedsPersonalDetails(profile: {
  full_name?: string | null;
  phone?: string | null;
  default_address?: string | null;
}) {
  const phone = profile.phone?.trim() ?? "";
  const address = profile.default_address?.trim() ?? "";
  const name = profile.full_name?.trim() ?? "";
  if (!name || !phone || !address) return true;
  if (isProfilePlaceholderValue(phone) || isProfilePlaceholderValue(address)) return true;
  return false;
}
