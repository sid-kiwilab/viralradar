"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";

const MAX_QUERIES = 5;

export async function inferNicheSearchQueries(args: {
  name: string;
  niche: string;
  positioning?: string;
  pageText?: string;
}): Promise<string[]> {
  const client = createOpenRouterClient();
  const payload = await chatJson<{ queries: string[] }>(
    client,
    `You suggest TikTok video search keywords for a brand's niche. Return JSON: { "queries": string[] } with 3 to ${MAX_QUERIES} phrases of 2 or 3 words that describe what this business sells. Not brand names. Not single common words. For an ad agency use phrases like "ugc ads" or "facebook ad creative", not "ai" or "creative" alone. No hashtags. No duplicates.`,
    JSON.stringify({
      brand: args.name,
      niche: args.niche,
      positioning: args.positioning,
      pageExcerpt: args.pageText?.slice(0, 6000),
    }),
  );

  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of payload.queries ?? []) {
    const q = raw?.trim().replace(/^#+/, "");
    if (!q || q.split(/\s+/).length < 2) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(q);
    if (list.length >= MAX_QUERIES) break;
  }
  return list;
}
