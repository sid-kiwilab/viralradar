/**
 * Parent-aisle + Explore tags. Matching is always against that scan's
 * inferred queries — this set only drops terms too wide for any DTC vertical.
 */
const GENERIC_TAGS = new Set([
  "app",
  "apparel",
  "asmr",
  "asmrsounds",
  "baby",
  "beauty",
  "clothes",
  "clothing",
  "dairyfree",
  "decor",
  "delicious",
  "dessert",
  "desserts",
  "explore",
  "fashion",
  "fitness",
  "food",
  "foodie",
  "foods",
  "frozendessert",
  "fyp",
  "gadgets",
  "gym",
  "hair",
  "health",
  "healthy",
  "homemade",
  "instagood",
  "instagram",
  "kids",
  "makeup",
  "mom",
  "ootd",
  "outfit",
  "parenting",
  "plantbased",
  "recipe",
  "recipes",
  "reels",
  "satisfying",
  "skincare",
  "snack",
  "snacks",
  "software",
  "style",
  "sweet",
  "sweets",
  "tasty",
  "tech",
  "travel",
  "treat",
  "treats",
  "trend",
  "trending",
  "vegan",
  "viral",
  "wellness",
  "workout",
  "yummy",
]);

export function normalizeHashtagToken(raw: string): string {
  return raw.replace(/^#+/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function compactText(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isGenericHashtag(tag: string): boolean {
  const token = normalizeHashtagToken(tag);
  return token.length < 4 || GENERIC_TAGS.has(token);
}

export function keepSpecificHashtags(tags: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const tag of tags) {
    const token = normalizeHashtagToken(tag);
    if (!token || isGenericHashtag(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    kept.push(token);
  }
  return kept;
}

export function keepSpecificKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of keywords) {
    const words = raw
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !GENERIC_TAGS.has(word));
    if (words.length < 2) {
      continue;
    }
    const key = words.join(" ");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    kept.push(raw.replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase());
  }
  return kept;
}

function keywordTokens(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !GENERIC_TAGS.has(word));
}

/** Distinctive product-form words from this brand's category (not a food-only list). */
export function productFormTokens(...texts: string[]): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const text of texts) {
    for (const word of text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)) {
      if (word.length < 3 || GENERIC_TAGS.has(word) || seen.has(word)) {
        continue;
      }
      seen.add(word);
      tokens.push(word);
    }
  }
  return tokens;
}

function haystackHasForm(haystack: string, formTokens: string[]): boolean {
  if (formTokens.length === 0) {
    return true;
  }
  const needed = Math.min(2, formTokens.length);
  let hit = 0;
  for (const token of formTokens) {
    if (haystack.includes(token)) {
      hit += 1;
    }
  }
  return hit >= needed;
}

export type NicheMatchQueries = {
  hashtags: string[];
  keywords: string[];
  searchCategory?: string;
  niche?: string;
};

/** Search Reel stays if caption/tags match this brand's queries and product form. */
export function reelMatchesNicheQueries(
  caption: string,
  itemTags: string[],
  queries: NicheMatchQueries,
): boolean {
  const haystack = compactText(`${caption} ${itemTags.join(" ")}`);
  if (!haystack) {
    return false;
  }

  const formTokens = productFormTokens(
    queries.searchCategory ?? "",
    queries.niche ?? "",
  );
  if (!haystackHasForm(haystack, formTokens)) {
    return false;
  }

  for (const tag of keepSpecificHashtags(queries.hashtags)) {
    if (haystack.includes(tag)) {
      return true;
    }
  }

  for (const keyword of queries.keywords) {
    const tokens = keywordTokens(keyword);
    if (tokens.length < 2) {
      continue;
    }
    if (tokens.every((token) => haystack.includes(token))) {
      return true;
    }
  }

  return false;
}
