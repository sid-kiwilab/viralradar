/** LLM JSON often returns one object instead of an array; normalize before for-of. */

export type CompetitorRow = { name?: string; website?: string };

function splitCommaSeparated(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isCompetitorRow(value: unknown): value is CompetitorRow {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function competitorRowHasFields(row: CompetitorRow): boolean {
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const website = typeof row.website === "string" ? row.website.trim() : "";
  return Boolean(name || website);
}

function competitorRowFromArrayItem(item: unknown): CompetitorRow[] {
  if (isCompetitorRow(item) && competitorRowHasFields(item)) {
    return [item];
  }
  if (typeof item === "string") {
    const name = item.trim();
    return name ? [{ name }] : [];
  }
  return [];
}

export function coerceCompetitorRows(raw: unknown): CompetitorRow[] {
  if (Array.isArray(raw)) {
    return raw.flatMap(competitorRowFromArrayItem);
  }
  if (typeof raw === "string") {
    return splitCommaSeparated(raw).map((name) => ({ name }));
  }
  if (isCompetitorRow(raw) && competitorRowHasFields(raw)) {
    return [raw];
  }
  return [];
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
