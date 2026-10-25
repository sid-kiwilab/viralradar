"use node";

const REQUEST_URL = "https://api.brightdata.com/request";
const SEARCH_TIMEOUT_MS = 90_000;

const BLOCKED_HOST_SUBSTRINGS = [
  "amazon.",
  "wikipedia.org",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "reddit.com",
  "facebook.com",
  "instagram.com",
  "pinterest.",
  "linkedin.com",
  "twitter.com",
  "x.com",
];

export type SerpOrganicHit = {
  title: string;
  link: string;
  snippet: string;
};

export type SerpQueryResult = {
  query: string;
  results: SerpOrganicHit[];
};

function serpCredentials(): { apiKey: string; zone: string } | null {
  const apiKey = process.env.BRIGHTDATA_API_KEY?.trim();
  const zone = process.env.BRIGHTDATA_SERP_ZONE?.trim();
  if (!apiKey || !zone) {
    return null;
  }
  return { apiKey, zone };
}

export function hasBrightDataSerp(): boolean {
  return serpCredentials() !== null;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return BLOCKED_HOST_SUBSTRINGS.some((needle) => host.includes(needle));
}

function filterOrganicHits(hits: SerpOrganicHit[]): SerpOrganicHit[] {
  const out: SerpOrganicHit[] = [];
  for (const hit of hits) {
    if (!hit.link?.trim()) {
      continue;
    }
    try {
      const url = new URL(hit.link);
      if (isBlockedHost(url.hostname)) {
        continue;
      }
    } catch {
      continue;
    }
    out.push(hit);
  }
  return out;
}

function parseOrganicFromPayload(data: unknown): SerpOrganicHit[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const organic = (data as { organic?: unknown }).organic;
  if (!Array.isArray(organic)) {
    return [];
  }

  const hits: SerpOrganicHit[] = [];
  for (const row of organic) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const item = row as {
      title?: unknown;
      link?: unknown;
      description?: unknown;
    };
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const link = typeof item.link === "string" ? item.link.trim() : "";
    const snippet =
      typeof item.description === "string" ? item.description.trim() : "";
    if (!title && !link) {
      continue;
    }
    hits.push({ title, link, snippet });
  }
  return hits;
}

function parseSerpResponseBody(body: string): SerpOrganicHit[] {
  const trimmed = body.trim();
  if (!trimmed) {
    return [];
  }
  try {
    return parseOrganicFromPayload(JSON.parse(trimmed) as unknown);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return parseOrganicFromPayload(
          JSON.parse(trimmed.slice(start, end + 1)) as unknown,
        );
      } catch {
        return [];
      }
    }
    return [];
  }
}

function formatSerpHttpError(status: number, body: string): string {
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 180);
  if (status === 401 || status === 403) {
    return "Bright Data SERP API key or zone was rejected. Check BRIGHTDATA_API_KEY and BRIGHTDATA_SERP_ZONE on Convex.";
  }
  if (status === 402) {
    return "Bright Data SERP has no credits left.";
  }
  return snippet
    ? `Bright Data SERP failed (${status}): ${snippet}`
    : `Bright Data SERP failed (${status})`;
}

export async function googleOrganicSearch(
  query: string,
): Promise<SerpOrganicHit[]> {
  const creds = serpCredentials();
  if (!creds) {
    throw new Error(
      "Set BRIGHTDATA_API_KEY and BRIGHTDATA_SERP_ZONE on the Convex deployment",
    );
  }

  const q = query.trim();
  if (!q) {
    return [];
  }

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=10&brd_json=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch(REQUEST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zone: creds.zone,
        url: googleUrl,
        format: "raw",
        data_format: "json",
      }),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(formatSerpHttpError(res.status, text));
    }

    const trimmed = text.trim();
    const hits = filterOrganicHits(parseSerpResponseBody(trimmed));
    if (
      hits.length === 0 &&
      (trimmed.startsWith("<!") ||
        trimmed.startsWith("<html") ||
        trimmed.toLowerCase().includes("<!doctype"))
    ) {
      throw new Error(
        "SERP returned HTML instead of JSON. Use a JSON/Light JSON zone or check BRIGHTDATA_SERP_ZONE.",
      );
    }
    return hits;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Bright Data SERP timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function googleOrganicSearchBatch(
  queries: string[],
  maxQueries = 3,
): Promise<SerpQueryResult[]> {
  const list = queries.map((q) => q.trim()).filter(Boolean).slice(0, maxQueries);
  const out: SerpQueryResult[] = [];
  for (const query of list) {
    const results = await googleOrganicSearch(query);
    out.push({ query, results });
  }
  return out;
}
