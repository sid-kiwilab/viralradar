"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { chatJsonWithRaw } from "../lib/llmJson";

export const BRAND_INFER_PROMPT_VERSION = "brand-infer-v2";

export type BrandInference = {
  name: string;
  niche: string;
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
- niche (string): the most specific product category the page supports — not a broader parent category
- service (string): 1–2 sentences describing what they actually do or sell
- products (string array): up to 6 named products, plans, or features explicitly mentioned; use [] if none are named
- audience (string): who the product is for
- positioning (optional string): how they claim to differ, one sentence; omit if unclear
- notThis (string): a nearby category this is NOT (the wrong bucket competitors often get lumped into)

Rules:
- Use only evidence from the page (title, meta, body). Do not use training knowledge about the company.
- Prefer the narrowest niche the copy supports. Example: a hidden live interview assistant is not "AI meeting notes" or "meeting transcription."
- notThis should name the parent category you are avoiding (e.g. "Not meeting transcription or note-taking apps").`;

type BrandInferencePayload = {
  name?: string;
  niche?: string;
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
  if (!name || !niche) {
    throw new Error("Could not infer brand name and niche from the page");
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
