"use node";

import type { FetchPageResult, PageSnapshot } from "./pageSnapshot";

const SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";
const SCRAPE_TIMEOUT_MS = 25_000;
const MAX_BODY_CHARS = 24_000;
const MAX_LINKS = 300;

function firecrawlApiKey(): string | null {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  return key || null;
}

export function hasFirecrawl(): boolean {
  return firecrawlApiKey() !== null;
}

function httpLinks(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      continue;
    }
    const href = item.trim();
    if (href.startsWith("http")) {
      out.push(href);
    }
    if (out.length >= MAX_LINKS) {
      break;
    }
  }
  return out;
}

function mapScrapeToSnapshot(url: string, data: unknown): PageSnapshot | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  const markdown =
    typeof record.markdown === "string" ? record.markdown.trim() : "";
  if (!markdown) {
    return null;
  }

  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};

  const title =
    typeof metadata.title === "string" ? metadata.title.trim() : "";
  const metaDescription =
    typeof metadata.description === "string"
      ? metadata.description.trim()
      : typeof metadata.ogDescription === "string"
        ? metadata.ogDescription.trim()
        : "";

  const resolvedUrl =
    typeof metadata.sourceURL === "string" && metadata.sourceURL.trim()
      ? metadata.sourceURL.trim()
      : typeof metadata.url === "string" && metadata.url.trim()
        ? metadata.url.trim()
        : url;

  return {
    url: resolvedUrl,
    title,
    metaDescription,
    bodyText: markdown.slice(0, MAX_BODY_CHARS),
    links: httpLinks(record.links),
  };
}

function firecrawlFailureReason(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();
  if (status === 401 || lower.includes("unauthorized")) {
    return "Firecrawl API key was rejected";
  }
  if (status === 402 || lower.includes("payment") || lower.includes("credit")) {
    return "Firecrawl has no credits left";
  }
  if (status === 429 || lower.includes("rate limit")) {
    return "Firecrawl rate limit reached";
  }
  if (status >= 400) {
    return `Firecrawl scrape failed (${status})`;
  }
  return "Firecrawl scrape failed";
}

/** One Firecrawl scrape attempt; caller handles Bright Data fallback. */
export async function fetchPageViaFirecrawl(url: string): Promise<FetchPageResult> {
  const apiKey = firecrawlApiKey();
  if (!apiKey) {
    return { ok: false, reason: "Firecrawl is not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

  try {
    const response = await fetch(SCRAPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        blockAds: true,
      }),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(bodyText) as unknown;
    } catch {
      return {
        ok: false,
        reason: firecrawlFailureReason(response.status, bodyText),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: firecrawlFailureReason(response.status, bodyText),
      };
    }

    const root = payload as { success?: boolean; data?: unknown; error?: string };
    if (root.success === false) {
      const err =
        typeof root.error === "string" && root.error.trim()
          ? root.error.trim()
          : "Firecrawl scrape failed";
      return { ok: false, reason: err };
    }

    const snapshot = mapScrapeToSnapshot(url, root.data);
    if (!snapshot) {
      return { ok: false, reason: "Firecrawl returned no page content" };
    }

    return { ok: true, snapshot };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "Firecrawl scrape timed out" };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: message };
  } finally {
    clearTimeout(timeout);
  }
}
