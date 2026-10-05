import { describe, expect, it } from "vitest";
import {
  authErrorToSignInParam,
  buildAuthCallbackUrl,
  isRecentlyCreatedAuthUser,
  oauthNoAccountSignInPath,
  oauthPkceCallbackUrl,
  parseOAuthIntent,
} from "@/lib/oauth-callback";

describe("parseOAuthIntent", () => {
  it("defaults to signin when missing or unknown", () => {
    expect(parseOAuthIntent(null)).toBe("signin");
    expect(parseOAuthIntent("")).toBe("signin");
    expect(parseOAuthIntent("other")).toBe("signin");
  });

  it("accepts signup", () => {
    expect(parseOAuthIntent("signup")).toBe("signup");
  });
});

describe("buildAuthCallbackUrl", () => {
  it("includes intent and optional next", () => {
    const url = buildAuthCallbackUrl("http://localhost:3000", {
      intent: "signin",
      next: "/request",
    });
    expect(url).toBe("http://localhost:3000/auth/callback?intent=signin&next=%2Frequest");
  });
});

describe("oauthPkceCallbackUrl", () => {
  it("has no query string for Google OAuth redirect allow list", () => {
    expect(oauthPkceCallbackUrl("https://home-fix-six.vercel.app")).toBe(
      "https://home-fix-six.vercel.app/auth/callback",
    );
  });
});

describe("oauth sign-in failures", () => {
  it("asks the person to retry when the OAuth code was already used", () => {
    expect(authErrorToSignInParam("flow_state_already_used")).toBe("oauth_retry");
    expect(authErrorToSignInParam("access_denied")).toBe("auth");
    expect(authErrorToSignInParam(null)).toBe("auth");
  });

  it("sends someone without an account to sign-in and keeps only an in-app return path", () => {
    const url = oauthNoAccountSignInPath("https://homefix.example", "/request?service=cleaning");
    expect(url.toString()).toBe(
      "https://homefix.example/auth/sign-in?error=no_account&next=%2Frequest%3Fservice%3Dcleaning",
    );

    const unsafe = oauthNoAccountSignInPath("https://homefix.example", "/\\evil.example");
    expect(unsafe.searchParams.get("error")).toBe("no_account");
    expect(unsafe.searchParams.get("next")).toBeNull();
  });
});

describe("isRecentlyCreatedAuthUser", () => {
  it("detects users created within the window", () => {
    const now = Date.parse("2026-07-26T08:00:30.000Z");
    expect(
      isRecentlyCreatedAuthUser(
        { created_at: "2026-07-26T08:00:15.000Z" },
        now,
        30_000,
      ),
    ).toBe(true);
  });

  it("treats older accounts as existing", () => {
    const now = Date.parse("2026-07-26T08:00:30.000Z");
    expect(
      isRecentlyCreatedAuthUser(
        { created_at: "2026-01-01T08:00:15.000Z" },
        now,
        30_000,
      ),
    ).toBe(false);
  });

  it("treats a missing or unreadable created time as an existing account", () => {
    expect(isRecentlyCreatedAuthUser({})).toBe(false);
    expect(isRecentlyCreatedAuthUser({ created_at: "not-a-date" })).toBe(false);
  });

  it("treats an account created exactly at the window edge as existing", () => {
    const now = Date.parse("2026-07-26T08:00:30.000Z");
    expect(
      isRecentlyCreatedAuthUser({ created_at: "2026-07-26T08:00:00.000Z" }, now, 30_000),
    ).toBe(false);
  });
});
