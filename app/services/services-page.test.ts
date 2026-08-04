import { describe, expect, it } from "vitest";
import { resolveServicesPageVariant } from "@/lib/auth-display";

describe("Services page layout for authenticated users", () => {
  it("renders inside the client app shell when the user is a signed-in client", () => {
    expect(
      resolveServicesPageVariant({ id: "user-1", full_name: "Maya", role: "client" }),
    ).toBe("client-app");
  });

  it("renders the public services layout for guests", () => {
    expect(resolveServicesPageVariant(null)).toBe("public");
  });
});
