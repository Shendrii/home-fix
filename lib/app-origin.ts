/** Canonical site origin for OAuth/email callbacks (no trailing slash). */
export function getAppOrigin(fallback?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return fallback ?? "";
}
