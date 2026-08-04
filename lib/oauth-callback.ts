export type OAuthIntent = "signin" | "signup";

export const OAUTH_INTENT_COOKIE = "hf_oauth_intent";
export const OAUTH_NEXT_COOKIE = "hf_oauth_next";

export function parseOAuthIntent(raw: string | null | undefined): OAuthIntent {
  return raw === "signup" ? "signup" : "signin";
}

/** Exact callback URL for Google OAuth (no query string — matches Supabase redirect allow list). */
export function oauthPkceCallbackUrl(origin: string) {
  return new URL("/auth/callback", origin).toString();
}

/** Builds the Supabase `redirectTo` URL for email confirmation callbacks. */
export function buildAuthCallbackUrl(
  origin: string,
  options?: { next?: string | null; intent?: OAuthIntent },
) {
  const url = new URL("/auth/callback", origin);
  const intent = options?.intent ?? "signup";
  url.searchParams.set("intent", intent);
  if (options?.next) url.searchParams.set("next", options.next);
  return url.toString();
}

/** Persist intent / return path across the Google OAuth redirect (PKCE callback URL stays bare). */
export function setOAuthResumeCookies(intent: OAuthIntent, next: string | null) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${OAUTH_INTENT_COOKIE}=${intent}; path=/; max-age=600; SameSite=Lax${secure}`;
  if (next) {
    document.cookie = `${OAUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${OAUTH_NEXT_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

export function authErrorToSignInParam(errorCode: string | null | undefined) {
  if (errorCode === "flow_state_already_used") return "oauth_retry";
  return "auth";
}

/**
 * Supabase creates an auth.users row on first OAuth sign-in. If `created_at` is within
 * `windowMs` of now, this exchange likely provisioned a new account (not an returning user).
 */
export function isRecentlyCreatedAuthUser(
  user: { created_at?: string | null },
  nowMs = Date.now(),
  windowMs = 30_000,
) {
  if (!user.created_at) return false;
  const createdMs = new Date(user.created_at).getTime();
  if (Number.isNaN(createdMs)) return false;
  return nowMs - createdMs < windowMs;
}

export const OAUTH_NO_ACCOUNT_ERROR = "no_account";

export function oauthNoAccountSignInPath(origin: string, returnTo?: string | null) {
  const url = new URL("/auth/sign-in", origin);
  url.searchParams.set("error", OAUTH_NO_ACCOUNT_ERROR);
  if (returnTo) url.searchParams.set("next", returnTo);
  return url;
}
