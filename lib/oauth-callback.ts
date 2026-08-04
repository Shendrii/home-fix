export type OAuthIntent = "signin" | "signup";

export function parseOAuthIntent(raw: string | null | undefined): OAuthIntent {
  return raw === "signup" ? "signup" : "signin";
}

/** Builds the Supabase `redirectTo` URL for OAuth / email confirmation callbacks. */
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
