import { describe, expect, it } from "vitest";
import {
  hasProfileValidationErrors,
  profileFormDefaults,
  profileNeedsPersonalDetails,
  roleLabel,
  validateProfileUpdate,
} from "@/lib/profile";

describe("validateProfileUpdate", () => {
  it("rejects empty editable fields", () => {
    const errors = validateProfileUpdate({
      full_name: "",
      phone: "   ",
      default_address: "",
    });
    expect(errors.full_name).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.default_address).toBeTruthy();
    expect(hasProfileValidationErrors(errors)).toBe(true);
  });

  it("rejects placeholder signup values", () => {
    const errors = validateProfileUpdate({
      full_name: "Alex",
      phone: "Pending update",
      default_address: "Pending update",
    });
    expect(errors.phone).toBeTruthy();
    expect(errors.default_address).toBeTruthy();
  });

  it("accepts trimmed non-empty values", () => {
    const errors = validateProfileUpdate({
      full_name: "Maya Thompson",
      phone: "(415) 555-0142",
      default_address: "214 Clement St, San Francisco",
    });
    expect(hasProfileValidationErrors(errors)).toBe(false);
  });
});

describe("roleLabel", () => {
  it("names each workspace", () => {
    expect(roleLabel("client")).toBe("Homeowner");
    expect(roleLabel("partner")).toBe("Service partner");
    expect(roleLabel("admin")).toBe("Operations");
    expect(roleLabel("superadmin")).toBe("Super admin");
  });
});

describe("profileFormDefaults", () => {
  it("clears placeholder phone and address so the person can type real ones", () => {
    expect(profileFormDefaults({
      full_name: " Maya ",
      phone: "Pending update",
      default_address: "Pending update",
    })).toEqual({ full_name: "Maya", phone: "", default_address: "" });
  });
});

describe("profileNeedsPersonalDetails", () => {
  it("detects placeholder signup profile rows", () => {
    expect(
      profileNeedsPersonalDetails({
        full_name: "yamba.shendri",
        phone: "Pending update",
        default_address: "Pending update",
      }),
    ).toBe(true);
  });

  it("passes when profile fields are complete", () => {
    expect(
      profileNeedsPersonalDetails({
        full_name: "Maya Thompson",
        phone: "(415) 555-0142",
        default_address: "214 Clement St, San Francisco",
      }),
    ).toBe(false);
  });
});
