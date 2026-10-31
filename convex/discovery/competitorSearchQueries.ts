"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { coerceQueryStrings } from "../lib/coerceModelLists";
import { chatJson } from "../lib/llmJson";
import type { BrandContext } from "../../lib/brandContext";

const QUERY_COUNT = 3;

export async function inferCompetitorSearchQueries(
  args: BrandContext,
): Promise<string[]> {
  const client = createOpenRouterClient();
  const payload = await chatJson<{ queries: string[] }>(
    client,
    `You suggest Google search queries to find direct competitor brands. Return JSON like {"queries":["best hidden interview assistant apps","Wispr Flow competitors","live coding interview help tools"]} with exactly ${QUERY_COUNT} queries. queries must be a JSON array.

Rules:
- Target the same specific product or service described in the payload (niche + service), not a broader parent category.
- Use notThis as a guard: do not write queries that would mostly return brands in that wrong category.
- Mix list-style ("best X software") and comparison ("BrandName competitors" or "BrandName alternatives").
- At least one query should mention the brand name.
- No quotes around queries. No duplicates.`,
    JSON.stringify({
      brand: args.name,
      niche: args.niche,
      service: args.service,
      products: args.products,
      audience: args.audience,
      positioning: args.positioning,
      notThis: args.notThis,
      pageExcerpt: args.pageText?.slice(0, 6000),
    }),
  );

  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of coerceQueryStrings(payload.queries)) {
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
