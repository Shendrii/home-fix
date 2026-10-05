import { profileNeedsPersonalDetails, type Profile } from "@/lib/profile";

const RETURN_ORIGIN = "https://homefix.local";

/** Relative in-app paths only — safe for post-auth redirects. */
export function safeReturnTo(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  // Browsers treat "\" and some control characters as "/", which can turn
  // "/\evil.example" into a navigation to another site.
  if (/[\\\u0000-\u001F\u007F]/.test(path)) return null;

  let resolved: URL;
  try {
    resolved = new URL(path, RETURN_ORIGIN);
  } catch {
    return null;
  }
  if (resolved.origin !== RETURN_ORIGIN || resolved.username || resolved.password) return null;

  const pathname = resolved.pathname;
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.startsWith("/auth")) return null;
  return `${pathname}${resolved.search}${resolved.hash}`;
}

export function roleHome(role: string | null | undefined) {
  if (role === "partner") return "/partner";
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

type PostAuthProfile = Pick<Profile, "role" | "full_name" | "phone" | "default_address"> | null;

/** Where to send the user after sign-in / OAuth callback. */
export function postAuthDestination(
  profile: PostAuthProfile,
  returnTo: string | null | undefined,
  options?: { afterSignUp?: boolean },
): string {
  const next = safeReturnTo(returnTo);
  const role = profile?.role;

  if (!profile) return "/account";

  if (role === "client" && profileNeedsPersonalDetails(profile)) {
    return "/account";
  }

  if (next) {
    if (role === "client") return next;
    if (role === "partner" && next.startsWith("/partner")) return next;
    if ((role === "admin" || role === "superadmin") && next.startsWith("/admin")) return next;
  }

  if (options?.afterSignUp && role === "client" && profileNeedsPersonalDetails(profile)) {
    return "/account";
  }

  return roleHome(role);
}

export function authPathWithReturn(
  path: "/auth/sign-in" | "/auth/sign-up",
  returnTo: string | null | undefined,
) {
  const safe = safeReturnTo(returnTo);
  if (!safe) return path;
  return `${path}?next=${encodeURIComponent(safe)}`;
}

export function bookingPath(serviceId?: string) {
  if (!serviceId) return "/request";
  return `/request?service=${encodeURIComponent(serviceId)}`;
}

export function isClientBookingPath(path: string) {
  return path === "/request" || path.startsWith("/request?");
}
