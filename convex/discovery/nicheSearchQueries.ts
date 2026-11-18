"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { coerceQueryStrings } from "../lib/coerceModelLists";
import { chatJsonWithRaw } from "../lib/llmJson";
import {
  keepSpecificHashtags,
  keepSpecificKeywords,
} from "../lib/nicheRelevance";
import type { BrandContext } from "../../lib/brandContext";

export const NICHE_SEARCH_PROMPT_VERSION = "niche-search-v3";

const MAX_HASHTAGS = 6;
const MAX_KEYWORDS = 3;

export type NicheSearchQueries = {
  hashtags: string[];
  keywords: string[];
  promptVersion: string;
  model: string;
  raw: string;
};

function normalizeHashtag(raw: string): string {
  return raw.replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
}

function normalizeKeyword(raw: string): string {
  return raw.replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export async function inferNicheSearchQueries(
  args: BrandContext,
): Promise<NicheSearchQueries> {
  const client = createOpenRouterClient();
  const { parsed, raw, model } = await chatJsonWithRaw<{
    hashtags?: unknown;
    keywords?: unknown;
  }>(
    client,
    `You write Instagram search terms for Reels in this brand's shoppable category (${NICHE_SEARCH_PROMPT_VERSION}). Works for any DTC vertical (food, apparel, beauty, wellness, software). Return one JSON object with keys "hashtags" (array of ${MAX_HASHTAGS} strings) and "keywords" (array of ${MAX_KEYWORDS} strings).

Rules:
- Terms come from this brand's niche / searchCategory / products — not from a frozen-dessert or food template.
- Every hashtag should be specific enough that a Reel using it is a peer or substitute (constraint + product form when that applies): womensleggings, retinolserum, veganicecream. Unique ingredients, fabrics, processes, or origin stories are not search terms.
- Never emit a parent aisle or Explore tag: food, fashion, fitness, beauty, skincare, gym, software, vegan, dessert, fyp, viral, asmr, explore.
- hashtags: one camel-joined phrase, no #, no spaces, no slashes.
- keywords: three to five plain words a shopper in this category would type, including the product form, no #.
- Stay out of the notThis bucket.
- No duplicates.`,
    JSON.stringify({
      brand: args.name,
      niche: args.niche,
      searchCategory: args.searchCategory,
      service: args.service,
      products: args.products,
      notThis: args.notThis,
    }),
  );

  const hashtags = keepSpecificHashtags(
    coerceQueryStrings(parsed.hashtags).map(normalizeHashtag),
  ).slice(0, MAX_HASHTAGS);

  const seenTag = new Set(hashtags);
  const keywords = keepSpecificKeywords(
    coerceQueryStrings(parsed.keywords).map(normalizeKeyword),
  )
    .filter((kw) => !seenTag.has(kw.replace(/\s+/g, "")))
    .slice(0, MAX_KEYWORDS);

  return {
    hashtags,
    keywords,
    promptVersion: NICHE_SEARCH_PROMPT_VERSION,
    model,
    raw,
  };
}
