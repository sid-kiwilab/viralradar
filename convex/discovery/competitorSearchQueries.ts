"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";

const QUERY_COUNT = 3;

export async function inferCompetitorSearchQueries(args: {
  name: string;
  niche: string;
  positioning?: string;
  pageText?: string;
}): Promise<string[]> {
  const client = createOpenRouterClient();
  const payload = await chatJson<{ queries: string[] }>(
    client,
    `You suggest Google search queries to find direct competitor brands in a niche. Return JSON: { "queries": string[] } with exactly ${QUERY_COUNT} queries. Mix list-style ("best X brands") and comparison ("BrandName competitors"). Use the brand niche, not the brand name alone as every query. No quotes around queries. No duplicates.`,
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
    const q = raw?.trim();
    if (!q || q.length < 4) {
      continue;
    }
    const key = q.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    list.push(q);
    if (list.length >= QUERY_COUNT) {
      break;
    }
  }
  return list;
}
