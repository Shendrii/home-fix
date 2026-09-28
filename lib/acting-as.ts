import { PROFILE_PLACEHOLDER } from "@/lib/profile";
import type { Role } from "@/lib/types";

export type { ServicesPageVariant } from "@/lib/auth-display";
export { resolveServicesPageVariant } from "@/lib/auth-display";

export const ACTING_AS_COOKIE = "hf_acting_as";

export type ActingTarget = {
  type: "company" | "client" | "admin";
  role: "partner" | "client" | "admin";
  userId: string;
  companyId: string | null;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function serializeActingTarget(target: ActingTarget) {
  return JSON.stringify(target);
}

export function parseActingTarget(raw: string | undefined | null): ActingTarget | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ActingTarget>;
    if (!value.userId || !uuid.test(value.userId)) return null;
    if (value.type === "company" && value.role === "partner" && value.companyId && uuid.test(value.companyId)) {
      return { type: "company", role: "partner", userId: value.userId, companyId: value.companyId };
    }
    if (value.type === "client" && value.role === "client" && (value.companyId == null || value.companyId === "")) {
      return { type: "client", role: "client", userId: value.userId, companyId: null };
    }
    if (value.type === "admin" && value.role === "admin" && (value.companyId == null || value.companyId === "")) {
      return { type: "admin", role: "admin", userId: value.userId, companyId: null };
    }
    return null;
  } catch {
    return null;
  }
}

export function readActingTargetFromDocument() {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split("; ").find((row) => row.startsWith(`${ACTING_AS_COOKIE}=`));
  if (!entry) return null;
  const raw = entry.slice(ACTING_AS_COOKIE.length + 1);
  try {
    return parseActingTarget(decodeURIComponent(raw));
  } catch {
    return parseActingTarget(raw);
  }
}

/** Superadmin may preview every non-superadmin workspace. */
export function canActAsRole(role: Role) {
  return role === "client" || role === "partner" || role === "admin";
}

export function actingPortalMatches(target: ActingTarget | null, portal: "partner" | "client") {
  return target?.role === portal;
}

/** Person being viewed. A placeholder name still resolves so the preview can open. */
export function actingDisplayName(profile: { full_name?: string | null; email?: string | null } | null) {
  const name = profile?.full_name?.trim();
  if (name && name !== PROFILE_PLACEHOLDER) return name;
  const email = profile?.email?.trim();
  if (email && email !== PROFILE_PLACEHOLDER) return email;
  return "this user";
}
