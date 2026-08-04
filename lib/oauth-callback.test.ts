import { describe, expect, it } from "vitest";
import {
  buildAuthCallbackUrl,
  isRecentlyCreatedAuthUser,
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
});
