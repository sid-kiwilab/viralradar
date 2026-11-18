"use node";

import { simplifyCategoryForGoogle } from "../../lib/googleSearchCategory";
import { createOpenRouterClient } from "../lib/openrouter";
import { chatJsonWithRaw } from "../lib/llmJson";

export const BRAND_INFER_PROMPT_VERSION = "brand-infer-v4";

export type BrandInference = {
  name: string;
  niche: string;
  searchCategory: string;
  service: string;
  products: string[];
  audience: string;
  positioning?: string;
  notThis: string;
};

export type BrandInferenceFromPage = {
  inference: BrandInference;
  promptVersion: string;
  model: string;
  rawModelOutput: string;
  pageTextExcerpt: string;
};

const BRAND_INFER_SYSTEM = `You infer what a company sells from homepage text only. Do not assume every site is a consumer packaged goods brand.

Return JSON with these keys:
- name (string): brand or product name from the page
- niche (string): the shoppable product category — diet or format constraints that define substitutes, plus the product form (may be slightly descriptive for the UI)
- searchCategory (string): 2–6 words only — plain shoppable category (diet or format plus product form); no slashes, parentheses, or the word alternative; never a hero ingredient or process
- service (string): 1–2 sentences describing what they actually do or sell
- products (string array): up to 6 named products, plans, or features explicitly mentioned; use [] if none are named
- audience (string): who the product is for
- positioning (optional string): how they claim to differ (unique base, process, packaging, origin); omit if unclear
- notThis (string): a nearby category this is NOT (the wrong bucket competitors often get lumped into)

Rules:
- Use only evidence from the page (title, meta, body). Do not use training knowledge about the company.
- niche is the category a shopper uses to find substitutes. Unique ingredients, bases, processes, packaging, or origin stories are positioning — never the niche.
- Do not pick the broadest parent (food, dessert, software) and do not pick the one-off method.
- notThis names the wrong nearby bucket, not the unique method.`;

type BrandInferencePayload = {
  name?: string;
  niche?: string;
  searchCategory?: string;
  service?: string;
  products?: unknown;
  audience?: string;
  positioning?: string;
  notThis?: string;
};

function coerceProducts(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const list: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      list.push(item.trim());
    }
    if (list.length >= 6) {
      break;
    }
  }
  return list;
}

function normalizeInference(payload: BrandInferencePayload): BrandInference {
  const name = payload.name?.trim();
  const niche = payload.niche?.trim();
  let searchCategory = payload.searchCategory?.trim();
  if (!name || !niche) {
    throw new Error("Could not infer brand name and niche from the page");
  }
  if (!searchCategory) {
    searchCategory = simplifyCategoryForGoogle(niche);
  }
  if (searchCategory.split(/\s+/).filter(Boolean).length > 8) {
    searchCategory = simplifyCategoryForGoogle(searchCategory);
  }

  const service =
    payload.service?.trim() ||
    payload.positioning?.trim() ||
    `Offers ${niche} (details not stated clearly on the homepage)`;
  const audience =
    payload.audience?.trim() || "Not stated clearly on the homepage";
  const notThis =
    payload.notThis?.trim() ||
    `Broader parent category for "${niche}" — exclude generic alternatives`;

  return {
    name,
    niche,
    searchCategory,
    service,
    products: coerceProducts(payload.products),
    audience,
    positioning: payload.positioning?.trim() || undefined,
    notThis,
  };
}

export async function inferBrandFromPage(
  url: string,
  pageText: string,
  title: string,
  metaDescription: string,
): Promise<BrandInferenceFromPage> {
  const pageTextExcerpt = pageText.slice(0, 12_000);
  const client = createOpenRouterClient();
  const { parsed, raw, model } = await chatJsonWithRaw<BrandInferencePayload>(
    client,
    BRAND_INFER_SYSTEM,
    JSON.stringify({
      url,
      title,
      metaDescription,
      pageText: pageTextExcerpt,
    }),
  );

  return {
    inference: normalizeInference(parsed),
    promptVersion: BRAND_INFER_PROMPT_VERSION,
    model,
    rawModelOutput: raw,
    pageTextExcerpt,
  };
}
