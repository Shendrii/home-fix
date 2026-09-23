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

export type ServicesPageVariant = "client-app" | "public" | "admin-only";

/** Logged-in clients browse services inside the app shell (same as booking). */
export function resolveServicesPageVariant(
  profile: Profile | null,
  actingRole?: "partner" | "client" | null,
): ServicesPageVariant {
  if (profile?.role === "client") return "client-app";
  if (profile?.role === "superadmin") return actingRole === "client" ? "client-app" : "admin-only";
  return "public";
}

export function canAccessClientBooking(userId: string | null, profile: Profile | null) {
  return Boolean(userId && profile?.role === "client");
}
