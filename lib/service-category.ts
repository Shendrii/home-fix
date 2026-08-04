import type { ServiceCategory } from "@/lib/types";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Resolves legacy mock slugs in booking URLs to the live Supabase UUID. */
export function resolveServiceCategoryId(
  categories: ServiceCategory[],
  selectedIdOrSlug: string,
) {
  const selected = selectedIdOrSlug.trim();
  if (!selected) return null;
  const direct = categories.find((category) => category.id === selected);
  if (direct) return direct.id;
  const selectedSlug = slug(selected);
  return categories.find((category) => slug(category.name) === selectedSlug)?.id ?? null;
}
