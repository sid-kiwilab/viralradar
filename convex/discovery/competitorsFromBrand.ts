"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";
import {
  googleOrganicSearchBatch,
  hasBrightDataSerp,
  type SerpQueryResult,
} from "../scraper/brightDataSerp";
import { inferCompetitorSearchQueries } from "./competitorSearchQueries";

import { MAX_COMPETITOR_BRANDS } from "../../lib/demo-limits";

const MAX_COMPETITORS = MAX_COMPETITOR_BRANDS;

export type CompetitorLead = {
  name: string;
  website?: string;
};

export type BrandContext = {
  name: string;
  niche: string;
  positioning?: string;
  pageText?: string;
};

export type DiscoverCompetitorsResult = {
  competitors: CompetitorLead[];
  source: "serp" | "memory";
  /** Shown on the scan job when SERP did not produce the final list. */
  notice?: string;
};

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
      const raw = err instanceof Error ? err.message : String(err);
      const short =
        raw.length > 220 ? `${raw.slice(0, 217).trim()}…` : raw.trim();
      return memoryWithNotice(
        args,
        short
          ? `Google competitor search failed (${short}); using model list.`
          : "Google competitor search failed; using model list.",
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
  const corpus = JSON.stringify({ brand: args.name, searches: serp });
  const payload = await chatJson<{
    competitors: { name?: string; website?: string }[];
  }>(
    client,
    `You extract direct competitor brand names from Google search results JSON. Return JSON: { "competitors": { "name": string, "website": string }[] } with up to ${MAX_COMPETITORS} consumer brands in the same niche as the input brand. Rules: every name MUST appear verbatim (case-insensitive ok) in a search result title, link, or snippet: do not use training knowledge. Exclude the scanned brand. Prefer official brand homepages from result links (https). Skip retailers-only, news, and review aggregators unless they are the brand site. No duplicates. Omit website if unsure.`,
    corpus,
  );

  return normalizeCompetitorList(args.name, payload.competitors ?? [], corpus);
}

async function inferCompetitorsFromMemory(
  args: BrandContext,
): Promise<CompetitorLead[]> {
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

  return normalizeCompetitorList(args.name, payload.competitors ?? []);
}

function normalizeCompetitorList(
  brandName: string,
  raw: { name?: string; website?: string }[],
  evidenceCorpus?: string,
): CompetitorLead[] {
  const corpusLower = evidenceCorpus?.toLowerCase();
  const seen = new Set<string>();
  const list: CompetitorLead[] = [];

  for (const row of raw) {
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
