"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";
import type { ResolvedTikTokAccount } from "../scraper/tiktokTypes";

/** Drop TikTok accounts whose posts are outside the brand's market. */
export async function filterAccountsForNiche(
  accounts: ResolvedTikTokAccount[],
  brand: { name: string; niche: string; positioning?: string },
): Promise<ResolvedTikTokAccount[]> {
  if (accounts.length === 0) return [];

  const client = createOpenRouterClient();
  const payload = await chatJson<{ handles: string[] }>(
    client,
    `You decide which TikTok accounts belong in this brand's market. Return JSON: { "handles": string[] } using only handles from the input. Keep a brand account only if it sells the same kind of product or service as the brand. Keep a niche creator only if the sample posts are about that same market. Drop unrelated hobbies, memes, and generic trending topics. Drop anything ambiguous. If none fit, return an empty list.`,
    JSON.stringify({
      brand: brand.name,
      niche: brand.niche,
      positioning: brand.positioning,
      accounts: accounts.map((account) => ({
        handle: account.handle,
        name: account.displayName ?? account.name,
        source: account.source ?? "brand",
        sample: account.sampleText ?? "",
      })),
    }),
  );

  const keep = new Set(
    (payload.handles ?? []).map((handle) => handle.replace(/^@/, "").toLowerCase()),
  );
  return accounts
    .filter((account) => keep.has(account.handle.toLowerCase()))
    .map(({ sampleText: _sample, ...account }) => account);
}
