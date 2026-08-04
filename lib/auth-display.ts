import type { Profile } from "@/lib/profile";
import type { Role } from "@/lib/types";

export type AuthSnapshot = {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
};

/** Public marketing header shows sign-in when there is no active session. */
export function shouldShowPublicSignIn({ loading, userId }: AuthSnapshot) {
  if (loading) return false;
  return !userId;
}

export function authenticatedPortalPath(role: Role | undefined) {
  if (role === "partner") return "/partner";
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

/** Logged-in clients browse services inside the app shell (same as booking). */
export function resolveServicesPageVariant(profile: Profile | null) {
  return profile?.role === "client" ? "client-app" : "public";
}

export function canAccessClientBooking(userId: string | null, profile: Profile | null) {
  return Boolean(userId && profile?.role === "client");
}
