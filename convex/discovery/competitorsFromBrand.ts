"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { coerceCompetitorRows } from "../lib/coerceModelLists";
import { chatJsonWithRaw } from "../lib/llmJson";
import {
  googleOrganicSearchBatch,
  hasBrightDataSerp,
  type SerpQueryResult,
} from "../scraper/brightDataSerp";
import { inferCompetitorSearchQueries } from "./competitorSearchQueries";
import type { BrandContext } from "../../lib/brandContext";

import { MAX_COMPETITOR_BRANDS } from "../../lib/demo-limits";

export type { BrandContext } from "../../lib/brandContext";

export const COMPETITOR_DISCOVER_PROMPT_VERSION = "competitor-discover-v3";

const MAX_COMPETITORS = MAX_COMPETITOR_BRANDS;
const SERP_EXCERPT_MAX = 24_000;

export type CompetitorLead = {
  name: string;
  website?: string;
  reason?: string;
};

export type DiscoverCompetitorsResult = {
  competitors: CompetitorLead[];
  source: "serp" | "memory";
  notice?: string;
  promptVersion: string;
  model: string;
  queries: string[];
  serpExcerpt?: string;
  rawQueryOutput?: string;
  rawExtractOutput?: string;
  rawMemoryOutput?: string;
  queryMs?: number;
  serpMs?: number;
  extractMs?: number;
  discoverMs: number;
};

type CompetitorPayloadRow = {
  name?: string;
  website?: string;
  reason?: string;
};

function brandContextPayload(args: BrandContext) {
  return {
    brand: args.name,
    niche: args.niche,
    service: args.service,
    products: args.products,
    audience: args.audience,
    positioning: args.positioning,
    notThis: args.notThis,
    pageExcerpt: args.pageText?.slice(0, 8000),
  };
}

function serpExcerptFromResults(serp: SerpQueryResult[]): string {
  return JSON.stringify(serp).slice(0, SERP_EXCERPT_MAX);
}

/** SERP-backed discovery with memory fallback when SERP is off or empty. */
export async function discoverCompetitors(
  args: BrandContext,
): Promise<DiscoverCompetitorsResult> {
  const discoverStarted = Date.now();

  if (hasBrightDataSerp()) {
    try {
      const queryStarted = Date.now();
      const queryResult = await inferCompetitorSearchQueries(args);
      const queryMs = Date.now() - queryStarted;

      if (queryResult.queries.length === 0) {
        return await memoryWithNotice(args, {
          notice:
            "Could not build Google queries; using model competitor list.",
          queryMs,
          rawQueryOutput: queryResult.rawQueryOutput,
          model: queryResult.model,
          queries: [],
          discoverStarted,
        });
      }

      const serpStarted = Date.now();
      const serp = await googleOrganicSearchBatch(queryResult.queries, 3);
      const serpMs = Date.now() - serpStarted;
      const serpExcerpt = serpExcerptFromResults(serp);

      const hasHits = serp.some((block) => block.results.length > 0);
      if (!hasHits) {
        return await memoryWithNotice(args, {
          notice:
            "Google search returned no organic results; using model competitor list.",
          queryMs,
          serpMs,
          rawQueryOutput: queryResult.rawQueryOutput,
          model: queryResult.model,
          queries: queryResult.queries,
          serpExcerpt,
          discoverStarted,
        });
      }

      const extractStarted = Date.now();
      const extracted = await extractCompetitorsFromSerp(args, serp);
      const extractMs = Date.now() - extractStarted;

      if (extracted.competitors.length > 0) {
        return {
          competitors: extracted.competitors,
          source: "serp",
          promptVersion: COMPETITOR_DISCOVER_PROMPT_VERSION,
          model: extracted.model,
          queries: queryResult.queries,
          serpExcerpt,
          rawQueryOutput: queryResult.rawQueryOutput,
          rawExtractOutput: extracted.raw,
          queryMs,
          serpMs,
          extractMs,
          discoverMs: Date.now() - discoverStarted,
        };
      }

      return await memoryWithNotice(args, {
        notice:
          "Google results did not yield named competitors; using model competitor list.",
        queryMs,
        serpMs,
        extractMs,
        rawQueryOutput: queryResult.rawQueryOutput,
        rawExtractOutput: extracted.raw,
        model: queryResult.model,
        queries: queryResult.queries,
        serpExcerpt,
        discoverStarted,
      });
    } catch (err) {
      console.error("[discoverCompetitors] SERP path failed", err);
      return await memoryWithNotice(args, {
        notice: "Google competitor search failed; using model list.",
        discoverStarted,
      });
    }
  }

  const memory = await inferCompetitorsFromMemory(args);
  return {
    competitors: memory.competitors,
    source: "memory",
    promptVersion: COMPETITOR_DISCOVER_PROMPT_VERSION,
    model: memory.model,
    queries: [],
    rawMemoryOutput: memory.raw,
    discoverMs: Date.now() - discoverStarted,
  };
}

/** Persists on the scan job through confirm (see scanBrand review gates). */
export function competitorReviewDetail(result: DiscoverCompetitorsResult): string {
  if (result.notice?.trim()) {
    return result.notice.trim();
  }
  if (result.source === "serp") {
    return "Competitors from Google search.";
  }
  return "Competitors from model list (Google search not configured on Convex).";
}

type MemoryWithNoticeArgs = {
  notice: string;
  discoverStarted: number;
  queryMs?: number;
  serpMs?: number;
  extractMs?: number;
  rawQueryOutput?: string;
  rawExtractOutput?: string;
  model?: string;
  queries?: string[];
  serpExcerpt?: string;
};

async function memoryWithNotice(
  args: BrandContext,
  ctx: MemoryWithNoticeArgs,
): Promise<DiscoverCompetitorsResult> {
  const memory = await inferCompetitorsFromMemory(args);
  return {
    competitors: memory.competitors,
    source: "memory",
    notice: ctx.notice,
    promptVersion: COMPETITOR_DISCOVER_PROMPT_VERSION,
    model: ctx.model ?? memory.model,
    queries: ctx.queries ?? [],
    serpExcerpt: ctx.serpExcerpt,
    rawQueryOutput: ctx.rawQueryOutput,
    rawExtractOutput: ctx.rawExtractOutput,
    rawMemoryOutput: memory.raw,
    queryMs: ctx.queryMs,
    serpMs: ctx.serpMs,
    extractMs: ctx.extractMs,
    discoverMs: Date.now() - ctx.discoverStarted,
  };
}

async function extractCompetitorsFromSerp(
  args: BrandContext,
  serp: SerpQueryResult[],
): Promise<{ competitors: CompetitorLead[]; raw: string; model: string }> {
  const client = createOpenRouterClient();
  const corpus = JSON.stringify({
    ...brandContextPayload(args),
    searches: serp,
  });
  const { parsed, raw, model } = await chatJsonWithRaw<{
    competitors: CompetitorPayloadRow[];
  }>(
    client,
    `You extract direct competitor brand names from Google search results JSON (competitor-discover-v3). Return JSON like {"competitors":[{"name":"Example Co","website":"https://example.com","reason":"Listed in snippet as X alternative"}]} with up to ${MAX_COMPETITORS} brands. competitors must be a JSON array.

Rules:
- Same specific product or service as the input brand (see service, niche, products). Do not pick brands that fit only the notThis category.
- Every name MUST appear verbatim (case-insensitive ok) in a search result title, link, or snippet: do not use training knowledge.
- reason: one short sentence citing which result field supports the pick (title/snippet text only).
- Exclude the scanned brand. Prefer official brand homepages from result links (https).
- Skip retailers-only, news, and review aggregators unless they are the brand site. No duplicates. Omit website if unsure.`,
    corpus,
  );

  return {
    competitors: normalizeCompetitorList(args.name, parsed.competitors, corpus),
    raw,
    model,
  };
}

async function inferCompetitorsFromMemory(
  args: BrandContext,
): Promise<{ competitors: CompetitorLead[]; raw: string; model: string }> {
  const client = createOpenRouterClient();
  const { parsed, raw, model } = await chatJsonWithRaw<{
    competitors: CompetitorPayloadRow[];
  }>(
    client,
    `You list direct competitors for a brand (competitor-discover-v3). Return JSON like {"competitors":[{"name":"Example Co","website":"https://example.com","reason":"Same live interview assistant category"}]} with up to ${MAX_COMPETITORS} companies. competitors must be a JSON array.

Rules:
- Same specific product or service as service and niche — not the broader parent in notThis.
- Exclude brands that belong in the notThis category. Exclude the brand itself.
- reason: one sentence on why they compete on the same job-to-be-done (no TikTok or social handles).
- website is the official homepage URL (https). Omit website if you are not sure. No duplicates.`,
    JSON.stringify(brandContextPayload(args)),
  );

  return {
    competitors: normalizeCompetitorList(args.name, parsed.competitors),
    raw,
    model,
  };
}

function normalizeCompetitorList(
  brandName: string,
  raw: unknown,
  evidenceCorpus?: string,
): CompetitorLead[] {
  const rows = coerceCompetitorRows(raw);
  const corpusLower = evidenceCorpus?.toLowerCase();
  const seen = new Set<string>();
  const list: CompetitorLead[] = [];

  for (const row of rows) {
    const name = row?.name?.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (key === brandName.toLowerCase()) {
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    if (corpusLower && !corpusLower.includes(name.toLowerCase())) {
      continue;
    }
    seen.add(key);
    const website = normalizeWebsite(row?.website);
    const reason =
      typeof (row as CompetitorPayloadRow).reason === "string"
        ? (row as CompetitorPayloadRow).reason!.trim() || undefined
        : undefined;
    list.push({ name, website, reason });
    if (list.length >= MAX_COMPETITORS) {
      break;
    }
  }
  return list;
}

function normalizeWebsite(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}
