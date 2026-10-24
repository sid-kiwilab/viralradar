"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";

const MAX_COMPETITORS = 5;

export async function inferCompetitorsFromBrand(args: {
  name: string;
  niche: string;
  positioning?: string;
  pageText?: string;
}): Promise<string[]> {
  const client = createOpenRouterClient();
  const payload = await chatJson<{ competitors: string[] }>(
    client,
    `You list direct competitors for a brand. Return JSON: { "competitors": string[] } with up to ${MAX_COMPETITORS} real company or brand names in the same niche. Exclude the brand itself. Prefer brands likely to post on TikTok. No duplicates.`,
    JSON.stringify({
      brand: args.name,
      niche: args.niche,
      positioning: args.positioning,
      pageExcerpt: args.pageText?.slice(0, 8000),
    }),
  );

  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of payload.competitors ?? []) {
    const name = raw?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (key === args.name.toLowerCase()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(name);
    if (list.length >= MAX_COMPETITORS) break;
  }
  return list;
}

/** OpenRouter: brand → competitor list (max 5). */
export const infer = action({
  args: {
    name: v.string(),
    niche: v.string(),
    positioning: v.optional(v.string()),
    pageText: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const competitors = await inferCompetitorsFromBrand(args);
    return { competitors };
  },
});
