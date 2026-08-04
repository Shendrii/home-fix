import { describe, expect, it } from "vitest";
import { resolveServiceCategoryId } from "@/lib/service-category";

describe("resolveServiceCategoryId", () => {
  const categories = [
    { id: "3811fa45-66fa-4a71-8ef8-260afa4b321e", name: "Cleaning" },
    { id: "dea56539-8bbf-4e75-bfb4-cf095f286f96", name: "Heating & AC" },
  ].map((category) => ({
    ...category,
    description: "",
    icon: "Wrench",
    color: "",
    startingPrice: 0,
    active: true,
  }));

  it("keeps a live Supabase ID", () => {
    expect(resolveServiceCategoryId(categories, categories[0].id)).toBe(categories[0].id);
  });

  it("maps legacy booking slugs to the live category ID", () => {
    expect(resolveServiceCategoryId(categories, "cleaning")).toBe(categories[0].id);
    expect(resolveServiceCategoryId(categories, "heating-and-ac")).toBe(categories[1].id);
  });
});
