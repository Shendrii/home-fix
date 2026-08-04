/** Relative in-app paths only — safe for post-auth redirects. */
export function safeReturnTo(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.startsWith("/auth")) return null;
  return path;
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
