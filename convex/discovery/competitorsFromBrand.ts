"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";

const MAX_COMPETITORS = 5;

export type CompetitorLead = {
  name: string;
  website?: string;
};

export async function inferCompetitorsFromBrand(args: {
  name: string;
  niche: string;
  positioning?: string;
  pageText?: string;
}): Promise<CompetitorLead[]> {
  const client = createOpenRouterClient();
  const payload = await chatJson<{
    competitors: { name?: string; website?: string }[];
  }>(
    client,
    `You list direct competitors for a brand. Return JSON: { "competitors": { "name": string, "website": string }[] } with up to ${MAX_COMPETITORS} companies that sell the same product or service. Exclude the brand itself. website is the official homepage URL (https). Omit website if you are not sure. Do not invent TikTok handles. No duplicates.`,
    JSON.stringify({
      brand: args.name,
      niche: args.niche,
      positioning: args.positioning,
      pageExcerpt: args.pageText?.slice(0, 8000),
    }),
  );

  const seen = new Set<string>();
  const list: CompetitorLead[] = [];
  for (const raw of payload.competitors ?? []) {
    const name = raw?.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (key === args.name.toLowerCase()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const website = normalizeWebsite(raw?.website);
    list.push({ name, website });
    if (list.length >= MAX_COMPETITORS) break;
  }
  return list;
}

function normalizeWebsite(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}
