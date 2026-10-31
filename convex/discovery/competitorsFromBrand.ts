"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { coerceCompetitorRows } from "../lib/coerceModelLists";
import { chatJson } from "../lib/llmJson";
import {
  googleOrganicSearchBatch,
  hasBrightDataSerp,
  type SerpQueryResult,
} from "../scraper/brightDataSerp";
import { inferCompetitorSearchQueries } from "./competitorSearchQueries";
import type { BrandContext } from "../../lib/brandContext";

import { MAX_COMPETITOR_BRANDS } from "../../lib/demo-limits";

export type { BrandContext } from "../../lib/brandContext";

const MAX_COMPETITORS = MAX_COMPETITOR_BRANDS;

export type CompetitorLead = {
  name: string;
  website?: string;
};

export type DiscoverCompetitorsResult = {
  competitors: CompetitorLead[];
  source: "serp" | "memory";
  /** Shown on the scan job when SERP did not produce the final list. */
  notice?: string;
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

/** SERP-backed discovery with memory fallback when SERP is off or empty. */
export async function discoverCompetitors(
  args: BrandContext,
): Promise<DiscoverCompetitorsResult> {
  if (hasBrightDataSerp()) {
    try {
      const queries = await inferCompetitorSearchQueries(args);
      if (queries.length === 0) {
        return memoryWithNotice(
          args,
          "Could not build Google queries; using model competitor list.",
        );
      }

      const serp = await googleOrganicSearchBatch(queries, 3);
      const hasHits = serp.some((block) => block.results.length > 0);
      if (!hasHits) {
        return memoryWithNotice(
          args,
          "Google search returned no organic results; using model competitor list.",
        );
      }

      const fromSerp = await extractCompetitorsFromSerp(args, serp);
      if (fromSerp.length > 0) {
        return { competitors: fromSerp, source: "serp" };
      }

      return memoryWithNotice(
        args,
        "Google results did not yield named competitors; using model competitor list.",
      );
    } catch (err) {
      console.error("[discoverCompetitors] SERP path failed", err);
      return memoryWithNotice(
        args,
        "Google competitor search failed; using model list.",
      );
    }
  }

  return {
    competitors: await inferCompetitorsFromMemory(args),
    source: "memory",
  };
}

/** Persists on the scan job through confirm (see scanBrand review_competitors patch). */
export function competitorReviewDetail(result: DiscoverCompetitorsResult): string {
  if (result.notice?.trim()) {
    return result.notice.trim();
  }
  if (result.source === "serp") {
    return "Competitors from Google search.";
  }
  return "Competitors from model list (Google search not configured on Convex).";
}

async function memoryWithNotice(
  args: BrandContext,
  notice: string,
): Promise<DiscoverCompetitorsResult> {
  return {
    competitors: await inferCompetitorsFromMemory(args),
    source: "memory",
    notice,
  };
}

async function extractCompetitorsFromSerp(
  args: BrandContext,
  serp: SerpQueryResult[],
): Promise<CompetitorLead[]> {
  const client = createOpenRouterClient();
  const corpus = JSON.stringify({
    ...brandContextPayload(args),
    searches: serp,
  });
  const payload = await chatJson<{
    competitors: { name?: string; website?: string }[];
  }>(
    client,
    `You extract direct competitor brand names from Google search results JSON. Return JSON like {"competitors":[{"name":"Example Co","website":"https://example.com"}]} with up to ${MAX_COMPETITORS} brands. competitors must be a JSON array.

Rules:
- Same specific product or service as the input brand (see service, niche, products). Do not pick brands that fit only the notThis category.
- Every name MUST appear verbatim (case-insensitive ok) in a search result title, link, or snippet: do not use training knowledge.
- Exclude the scanned brand. Prefer official brand homepages from result links (https).
- Skip retailers-only, news, and review aggregators unless they are the brand site. No duplicates. Omit website if unsure.`,
    corpus,
  );

  return normalizeCompetitorList(args.name, payload.competitors, corpus);
}

async function inferCompetitorsFromMemory(
  args: BrandContext,
): Promise<CompetitorLead[]> {
  const client = createOpenRouterClient();
  const payload = await chatJson<{
    competitors: { name?: string; website?: string }[];
  }>(
    client,
    `You list direct competitors for a brand. Return JSON like {"competitors":[{"name":"Example Co","website":"https://example.com"}]} with up to ${MAX_COMPETITORS} companies. competitors must be a JSON array.

Rules:
- Same specific product or service (see service, niche, products). Exclude brands that belong in the notThis category.
- Exclude the brand itself. website is the official homepage URL (https). Omit website if you are not sure. Do not invent TikTok handles. No duplicates.`,
    JSON.stringify(brandContextPayload(args)),
  );

  return normalizeCompetitorList(args.name, payload.competitors);
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
    list.push({ name, website });
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
