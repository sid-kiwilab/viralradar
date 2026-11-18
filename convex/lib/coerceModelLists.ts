/** LLM JSON often returns one object instead of an array; normalize before for-of. */

function splitCommaSeparated(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function coerceQueryStrings(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.includes(",")) {
      return splitCommaSeparated(trimmed);
    }
    return [trimmed];
  }
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    return Object.values(raw as Record<string, unknown>).filter(
      (item): item is string => typeof item === "string",
    );
  }
  return [];
}
