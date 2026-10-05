import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { OAUTH_INTENT_COOKIE, OAUTH_NEXT_COOKIE } from "@/lib/oauth-callback";
import { readOAuthResumeFromRequest } from "@/lib/oauth-resume-cookie";

function request(cookies: Record<string, string>) {
  return {
    cookies: {
      get(name: string) {
        const value = cookies[name];
        return value === undefined ? undefined : { name, value };
      },
    },
  } as unknown as NextRequest;
}

describe("readOAuthResumeFromRequest", () => {
  it("reads signup intent and the return path from the callback URL", () => {
    const url = new URL("https://homefix.example/auth/callback?intent=signup&next=%2Frequest");
    expect(readOAuthResumeFromRequest(request({}), url)).toEqual({
      intent: "signup",
      next: "/request",
    });
  });

  it("prefers the resume cookies over the query string", () => {
    const url = new URL("https://homefix.example/auth/callback?intent=signin&next=%2Fdashboard");
    expect(readOAuthResumeFromRequest(request({
      [OAUTH_INTENT_COOKIE]: "signup",
      [OAUTH_NEXT_COOKIE]: encodeURIComponent("/partner/jobs"),
    }), url)).toEqual({
      intent: "signup",
      next: "/partner/jobs",
    });
  });

  it("drops an unsafe return path and defaults a missing intent to sign-in", () => {
    const url = new URL("https://homefix.example/auth/callback");
    expect(readOAuthResumeFromRequest(request({
      [OAUTH_NEXT_COOKIE]: encodeURIComponent("/\\evil.example"),
    }), url)).toEqual({
      intent: "signin",
      next: null,
    });
  });
});
