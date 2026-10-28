"use node";

import type { Page } from "playwright-core";
import { waitForCaptcha } from "./brightDataCdp";
import { withBrowserSession } from "./browser";
import { formatScraperError } from "../lib/scraperErrors";
import { tiktokVideoUrl } from "../lib/tiktokUrls";
import {
  hasApifyTikTok,
  scrapeCompetitorsOnTikTokViaApify,
  scrapeTikTokHandlesViaApify,
} from "./apifyTikTok";
import type {
  ScrapedTikTokPost,
  TikTokHandleScrape,
  TikTokScrapeBatch,
} from "./tiktokTypes";

export type { ScrapedTikTokPost, TikTokHandleScrape, TikTokScrapeBatch };

function parseViewCount(raw: string | number | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (!raw) return 0;
  const s = String(raw).trim().toUpperCase().replace(/,/g, "");
  const match = s.match(/^([\d.]+)\s*([KMB])?/);
  if (!match) return 0;
  let n = parseFloat(match[1]!);
  const suffix = match[2];
  if (suffix === "K") n *= 1_000;
  if (suffix === "M") n *= 1_000_000;
  if (suffix === "B") n *= 1_000_000_000;
  return Math.round(n);
}

function extractPostsFromHtml(html: string, handle: string): ScrapedTikTokPost[] {
  const posts: ScrapedTikTokPost[] = [];
  const now = Date.now();

  const rehydrateMatch = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (rehydrateMatch) {
    try {
      const data = JSON.parse(rehydrateMatch[1]!) as Record<string, unknown>;
      const itemList = findVideoItems(data);
      for (const item of itemList) {
        const mapped = mapItemToPost(item, handle, now);
        if (mapped) posts.push(mapped);
      }
    } catch {
      // fall through to DOM
    }
  }

  if (posts.length === 0) {
    const sigiMatch = html.match(
      /<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (sigiMatch) {
      try {
        const data = JSON.parse(sigiMatch[1]!) as Record<string, unknown>;
        const itemList = findVideoItems(data);
        for (const item of itemList) {
          const mapped = mapItemToPost(item, handle, now);
          if (mapped) posts.push(mapped);
        }
      } catch {
        // DOM fallback below
      }
    }
  }

  return dedupePosts(posts);
}

function findVideoItems(data: unknown): unknown[] {
  const out: unknown[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const el of node) visit(el);
      return;
    }
    const record = node as Record<string, unknown>;
    if (
      typeof record.id === "string" &&
      (record.desc !== undefined || record.title !== undefined) &&
      (record.stats !== undefined || record.playCount !== undefined)
    ) {
      out.push(record);
    }
    for (const value of Object.values(record)) {
      visit(value);
    }
  };
  visit(data);
  return out;
}

function mapItemToPost(
  item: unknown,
  handle: string,
  scrapedAt: number,
): ScrapedTikTokPost | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const id =
    (typeof record.id === "string" && record.id) ||
    (typeof record.awemeId === "string" && record.awemeId) ||
    null;
  if (!id) return null;

  const stats =
    (record.stats as Record<string, unknown> | undefined) ?? record;
  const views = parseViewCount(
    (stats.playCount as number | string | undefined) ??
      (stats.viewCount as number | string | undefined),
  );
  const likes = parseViewCount(stats.diggCount as number | string | undefined);
  const comments = parseViewCount(
    stats.commentCount as number | string | undefined,
  );
  const shares = parseViewCount(stats.shareCount as number | string | undefined);

  const caption =
    (typeof record.desc === "string" && record.desc) ||
    (typeof record.title === "string" && record.title) ||
    "";

  const video = record.video as Record<string, unknown> | undefined;
  const cover =
    (video?.cover as string | undefined) ||
    (video?.dynamicCover as string | undefined) ||
    "";
  const durationSec =
    typeof video?.duration === "number" ? video.duration : 0;

  const createTime =
    typeof record.createTime === "number"
      ? record.createTime * 1000
      : scrapedAt;

  const music = record.music as Record<string, unknown> | undefined;
  const soundId =
    typeof music?.id === "string"
      ? music.id
      : typeof music?.mid === "string"
        ? music.mid
        : undefined;

  return {
    postId: id,
    url: tiktokVideoUrl(handle, id),
    thumbnail: cover || "",
    caption,
    duration: durationSec,
    views,
    likes,
    comments,
    shares,
    soundId,
    postedAt: createTime,
  };
}

function dedupePosts(posts: ScrapedTikTokPost[]): ScrapedTikTokPost[] {
  const seen = new Set<string>();
  const out: ScrapedTikTokPost[] = [];
  for (const post of posts) {
    if (seen.has(post.postId)) continue;
    seen.add(post.postId);
    out.push(post);
  }
  return out;
}

async function scrapePostsFromDom(page: Page): Promise<ScrapedTikTokPost[]> {
  const scrapedAt = Date.now();
  const rows = await page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[href*="/video/"]'),
    ) as HTMLAnchorElement[];
    const results: {
      href: string;
      postId: string;
      viewsText: string;
      caption: string;
      thumb: string;
    }[] = [];
    const seen = new Set<string>();
    for (const a of anchors) {
      const match = a.href.match(/\/video\/(\d+)/);
      if (!match) continue;
      const postId = match[1]!;
      if (seen.has(postId)) continue;
      seen.add(postId);
      const card = a.closest('[data-e2e="user-post-item"]') ?? a.parentElement;
      const viewsEl = card?.querySelector('[class*="video-count"], strong');
      results.push({
        href: a.href,
        postId,
        viewsText: viewsEl?.textContent?.trim() ?? "",
        caption: a.getAttribute("title") ?? "",
        thumb: (a.querySelector("img") as HTMLImageElement | null)?.src ?? "",
      });
      if (results.length >= 24) break;
    }
    return results;
  });

  return rows.map((row) => ({
    postId: row.postId,
    url: row.href,
    thumbnail: row.thumb,
    caption: row.caption,
    duration: 0,
    views: parseViewCount(row.viewsText),
    likes: 0,
    comments: 0,
    shares: 0,
    postedAt: scrapedAt,
  }));
}

export async function searchTikTokHandle(
  page: Page,
  displayName: string,
): Promise<string | null> {
  const q = encodeURIComponent(displayName);
  await page.goto(`https://www.tiktok.com/search/user?q=${q}`, {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });
  await waitForCaptcha(page);
  await page.waitForTimeout(2000);

  const handle = await page.evaluate((needle) => {
    const links = Array.from(
      document.querySelectorAll('a[href*="/@"]'),
    ) as HTMLAnchorElement[];
    const needleLower = needle.toLowerCase();
    for (const a of links) {
      const match = a.href.match(/tiktok\.com\/@([^/?#]+)/i);
      if (!match) continue;
      const h = match[1]!;
      const text = (a.textContent ?? "").toLowerCase();
      if (text.includes(needleLower) || needleLower.includes(h.toLowerCase())) {
        return h;
      }
    }
    const first = links
      .map((a) => a.href.match(/tiktok\.com\/@([^/?#]+)/i)?.[1])
      .find(Boolean);
    return first ?? null;
  }, displayName);

  return handle;
}

export async function scrapeTikTokProfile(
  page: Page,
  handle: string,
): Promise<TikTokHandleScrape> {
  await page.goto(`https://www.tiktok.com/@${handle}`, {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });
  await waitForCaptcha(page);
  await page.waitForTimeout(2500);

  const html = await page.content();
  let posts = extractPostsFromHtml(html, handle);
  if (posts.length === 0) {
    posts = await scrapePostsFromDom(page);
  }

  const displayName = await page
    .locator('[data-e2e="user-title"]')
    .first()
    .textContent()
    .catch(() => null);

  return {
    handle,
    displayName: displayName?.trim() || undefined,
    posts,
  };
}

function rethrowScraperError(err: unknown): never {
  const raw = err instanceof Error ? err.message : String(err);
  throw new Error(formatScraperError(raw));
}

export async function scrapeCompetitorsOnTikTok(
  competitorNames: string[],
  onProgress?: (detail: string) => Promise<void>,
  handles?: string[],
): Promise<TikTokScrapeBatch> {
  if (hasApifyTikTok()) {
    if (handles && handles.length > 0) {
      return scrapeTikTokHandlesViaApify(handles, onProgress);
    }
    return scrapeCompetitorsOnTikTokViaApify(competitorNames, onProgress);
  }

  const results: TikTokHandleScrape[] = [];

  try {
    await withBrowserSession(async (page) => {
      for (const name of competitorNames) {
        if (onProgress) {
          await onProgress(`Searching TikTok for ${name}`);
        }
        let handle: string | null;
        try {
          handle = await searchTikTokHandle(page, name);
        } catch (err) {
          rethrowScraperError(err);
        }
        if (!handle) {
          continue;
        }
        if (onProgress) {
          await onProgress(`Loading @${handle}`);
        }
        let scrape: TikTokHandleScrape;
        try {
          scrape = await scrapeTikTokProfile(page, handle);
        } catch (err) {
          rethrowScraperError(err);
        }
        if (scrape.posts.length > 0) {
          results.push(scrape);
        }
      }
    });
  } catch (err) {
    rethrowScraperError(err);
  }

  return { handles: results };
}
