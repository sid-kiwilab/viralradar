"use node";

import {
  APIFY_GENERIC_USER_MESSAGE,
  APIFY_INSTAGRAM_TIMEOUT_USER_MESSAGE,
} from "../lib/apifyMessages";
import {
  instagramReelUrl,
  instagramShortcodeFromUrl,
} from "../lib/instagramUrls";
import type { ScrapedInstagramPost } from "./instagramTypes";

export type ApifyItem = Record<string, unknown>;

export class ApifyRunError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status: number,
    readonly rawBody: string,
  ) {
    super(message);
    this.name = "ApifyRunError";
  }
}

export const APIFY_RUN_TIMEOUT_SEC = 180;
export const APIFY_RUN_ATTEMPTS = 2;
export const APIFY_RETRY_SLEEP_MS = 2000;

export function getApifyApiKey(): string {
  const key = process.env.APIFY_API_KEY?.trim();
  if (!key) {
    throw new Error("Set APIFY_API_KEY on the Convex deployment");
  }
  return key;
}

export function hasApifyApiKey(): boolean {
  return Boolean(process.env.APIFY_API_KEY?.trim());
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isApifyTimeoutResponse(status: number, body: string): boolean {
  return status === 408 || /\btimeout\b/i.test(body);
}

function isApifyNonRetryableStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}

async function runActorOnce(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSec: number,
): Promise<ApifyItem[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?timeout=${timeoutSec}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApifyApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const retryable =
      !isApifyNonRetryableStatus(res.status) &&
      isApifyTimeoutResponse(res.status, text);
    const userMessage = isApifyTimeoutResponse(res.status, text)
      ? APIFY_INSTAGRAM_TIMEOUT_USER_MESSAGE
      : APIFY_GENERIC_USER_MESSAGE;
    throw new ApifyRunError(userMessage, retryable, res.status, text);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(APIFY_GENERIC_USER_MESSAGE);
  }
  return data as ApifyItem[];
}

/** Sync Apify actor run with one timeout retry. */
export async function runApifyActorDataset(
  actorId: string,
  input: Record<string, unknown>,
  options: {
    logLabel: string;
    retryDetail: string;
    onProgress?: (detail: string) => Promise<void>;
  },
): Promise<ApifyItem[]> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= APIFY_RUN_ATTEMPTS; attempt++) {
    try {
      return await runActorOnce(actorId, input, APIFY_RUN_TIMEOUT_SEC);
    } catch (err) {
      if (err instanceof ApifyRunError) {
        console.error(`[${options.logLabel}] attempt failed`, {
          attempt,
          status: err.status,
          retryable: err.retryable,
          body: err.rawBody.slice(0, 800),
        });
        lastError = err;
        if (err.retryable && attempt < APIFY_RUN_ATTEMPTS) {
          await options.onProgress?.(options.retryDetail);
          await sleep(APIFY_RETRY_SLEEP_MS);
          continue;
        }
        throw new Error(err.message);
      }
      throw err;
    }
  }
  throw lastError ?? new Error(APIFY_GENERIC_USER_MESSAGE);
}

export function instagramHashtagsFromItem(item: ApifyItem): string[] {
  const raw = item.hashtags;
  if (!Array.isArray(raw)) {
    return [];
  }
  const tags: string[] = [];
  for (const value of raw) {
    if (typeof value === "string" && value.trim()) {
      tags.push(value.trim());
    }
  }
  const queryTag = asString(item.queryTag);
  if (queryTag) {
    tags.push(queryTag);
  }
  return tags;
}

export function instagramOwnerHandleFromItem(item: ApifyItem): string | null {
  const owner = asRecord(item.owner);
  const raw =
    asString(item.ownerUsername) ??
    asString(owner?.username) ??
    asString(item.username) ??
    asString(item.ownerFullName);
  if (!raw) {
    return null;
  }
  const handle = raw.replace(/^@/, "").split(/[/?#]/)[0]?.trim().toLowerCase();
  return handle || null;
}

export function instagramShortcodeFromItem(item: ApifyItem): string | null {
  const raw =
    asString(item.shortCode) ??
    asString(item.shortcode) ??
    instagramShortcodeFromUrl(asString(item.url) ?? asString(item.inputUrl) ?? "");
  return raw?.trim() || null;
}

export function instagramPostedAtFromItem(item: ApifyItem): number {
  const ts = asNumber(item.timestamp);
  if (ts > 1_000_000_000_000) {
    return ts;
  }
  if (ts > 1_000_000_000) {
    return ts * 1000;
  }
  const iso = asString(item.takenAt) ?? asString(item.timestamp);
  if (iso) {
    const parsed = Date.parse(iso);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

export function instagramViewCountFromItem(item: ApifyItem): number {
  return Math.max(
    asNumber(item.videoViewCount),
    asNumber(item.videoPlayCount),
    asNumber(item.playCount),
    asNumber(item.viewsCount),
    asNumber(item.plays),
  );
}

export function isInstagramReelItem(item: ApifyItem): boolean {
  const productType = asString(item.productType)?.toLowerCase();
  if (productType === "clips") {
    return true;
  }
  const type = asString(item.type)?.toLowerCase();
  if (type === "video" || type === "reel") {
    const url = asString(item.url) ?? asString(item.inputUrl) ?? "";
    if (/\/reel\//i.test(url)) {
      return true;
    }
  }
  const url = asString(item.url) ?? asString(item.inputUrl) ?? "";
  return /\/reel\//i.test(url);
}

export function mapApifyItemToInstagramPost(
  item: ApifyItem,
  options?: { reelsOnly?: boolean },
): ScrapedInstagramPost | null {
  if (options?.reelsOnly && !isInstagramReelItem(item)) {
    return null;
  }
  const shortcode = instagramShortcodeFromItem(item);
  if (!shortcode) {
    return null;
  }
  const views = instagramViewCountFromItem(item);
  const likes = asNumber(item.likesCount) || asNumber(item.likes);
  const comments = asNumber(item.commentsCount) || asNumber(item.comments);
  return {
    postId: shortcode,
    url: asString(item.url) ?? instagramReelUrl(shortcode),
    thumbnail:
      asString(item.displayUrl) ??
      asString(item.display_url) ??
      asString(item.thumbnailUrl) ??
      asString(item.thumbnail) ??
      "",
    caption: asString(item.caption) ?? "",
    duration: asNumber(item.videoDuration) || asNumber(item.duration),
    views,
    likes,
    comments,
    shares: asNumber(item.sharesCount),
    postedAt: instagramPostedAtFromItem(item),
  };
}
