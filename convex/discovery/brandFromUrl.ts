"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";

export type BrandInference = {
  name: string;
  niche: string;
  positioning?: string;
};

export async function inferBrandFromPage(
  url: string,
  pageText: string,
  title: string,
  metaDescription: string,
): Promise<BrandInference> {
  const client = createOpenRouterClient();
  const payload = await chatJson<BrandInference>(
    client,
    `You infer a consumer brand from website text. Return JSON with keys: name (string), niche (string), positioning (optional string, one sentence). Use only evidence from the page. If unclear, say so briefly in positioning.`,
    JSON.stringify({
      url,
      title,
      metaDescription,
      pageText: pageText.slice(0, 12_000),
    }),
  );

  if (!payload.name?.trim() || !payload.niche?.trim()) {
    throw new Error("Could not infer brand name and niche from the page");
  }

  return {
    name: payload.name.trim(),
    niche: payload.niche.trim(),
    positioning: payload.positioning?.trim() || undefined,
  };
}

/** LLM action (OpenRouter): brand URL page text → name, niche, positioning. */
export const infer = action({
  args: {
    url: v.string(),
    pageText: v.string(),
    title: v.string(),
    metaDescription: v.string(),
  },
  handler: async (_ctx, args) => {
    return await inferBrandFromPage(
      args.url,
      args.pageText,
      args.title,
      args.metaDescription,
    );
  },
});
