import type { NextRequest, NextResponse } from "next/server";
import { safeReturnTo } from "@/lib/auth-return";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_NEXT_COOKIE,
  parseOAuthIntent,
} from "@/lib/oauth-callback";

export function readOAuthResumeFromRequest(request: NextRequest, url: URL) {
  const intentRaw =
    request.cookies.get(OAUTH_INTENT_COOKIE)?.value ?? url.searchParams.get("intent");
  const nextCookie = request.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  const nextFromUrl = url.searchParams.get("next");
  const nextDecoded = nextCookie ? decodeURIComponent(nextCookie) : nextFromUrl;
  return {
    intent: parseOAuthIntent(intentRaw),
    next: safeReturnTo(nextDecoded),
  };
}

export function clearOAuthResumeCookies(response: NextResponse) {
  response.cookies.set(OAUTH_INTENT_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
}
