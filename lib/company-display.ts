/** Formats companies.operating_hours (jsonb or legacy text) for display. */
export function formatOperatingHours(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0) return null;
    if (typeof record.summary === "string" && record.summary.trim()) {
      return record.summary.trim();
    }
    const parts = keys
      .sort()
      .map((key) => {
        const slot = record[key];
        if (typeof slot === "string") {
          const trimmed = slot.trim();
          if (!trimmed) return null;
          return `${key}: ${trimmed}`;
        }
        if (slot == null || slot === "") return null;
        return `${key}: ${JSON.stringify(slot)}`;
      })
      .filter(Boolean) as string[];
    return parts.length ? parts.join(" · ") : null;
  }
  return null;
}
