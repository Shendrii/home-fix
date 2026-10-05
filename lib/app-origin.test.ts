import { afterEach, describe, expect, it } from "vitest";
import { getAppOrigin } from "@/lib/app-origin";

describe("getAppOrigin", () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = previous;
  });

  it("uses the configured site and drops a trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";
    expect(getAppOrigin()).toBe("http://localhost:3000");
  });

  it("uses the browser origin when the site is not configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppOrigin("http://127.0.0.1:3000")).toBe(window.location.origin);
    process.env.NEXT_PUBLIC_APP_URL = "";
    expect(getAppOrigin()).toBe(window.location.origin);
  });
});