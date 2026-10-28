"use node";

import {
  APIFY_GENERIC_USER_MESSAGE,
  APIFY_TIKTOK_TIMEOUT_USER_MESSAGE,
} from "../lib/apifyMessages";
import { formatScraperError } from "../lib/scraperErrors";
import {
  TIKTOK_RETRY_SLOW,
  TIKTOK_RETRY_STILL_SLOW,
  TIKTOK_WAIT_DETAIL,
} from "../../lib/tiktok-wait";

export { APIFY_TIKTOK_TIMEOUT_USER_MESSAGE } from "../lib/apifyMessages";
import { tiktokVideoUrl } from "../lib/tiktokUrls";
import { BASELINE_RECENT_COUNT } from "../scoring";
import type {
  ResolvedTikTokAccount,
  ScrapedTikTokPost,
  TikTokHandleScrape,
  TikTokScrapeBatch,
} from "./tiktokTypes";

const ACTOR_ID = "clockworks~tiktok-scraper";
const LATEST_PER_PROFILE = BASELINE_RECENT_COUNT;
const POPULAR_PER_PROFILE = 20;
const MAX_PROFILES_PER_QUERY = 3;
const RUN_TIMEOUT_SEC = 180;
const RUN_ATTEMPTS = 3;
const PROFILE_TIMEOUT_SEC = 120;
const PROFILE_ATTEMPTS = 2;
const RETRY_SLEEP_MS = 2000;

const NO_MEDIA_FLAGS = {
  shouldDownloadVideos: false,
  shouldDownloadCovers: false,
  shouldDownloadSlideshowImages: false,
  shouldDownloadAvatars: false,
  shouldDownloadMusicCovers: false,
  downloadSubtitlesOptions: "NEVER_DOWNLOAD_SUBTITLES",
  scrapeRelatedVideos: false,
  scrapeRelatedSearchWords: false,
  aiVideoDescription: false,
  aiVideoSummary: false,
} as const;

type ApifyItem = Record<string, unknown>;

function apifyKey(): string {
  const key = process.env.APIFY_API_KEY?.trim();
  if (!key) {
    throw new Error("Set APIFY_API_KEY on the Convex deployment");
  }
  return key;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeHandle(raw: string | undefined): string | null {
  if (!raw) return null;
  const handle = raw.replace(/^@/, "").split(/[/?#]/)[0]?.trim();
  return handle || null;
}

function handleFromItem(item: ApifyItem): string | null {
  const author = asRecord(item.authorMeta);
  return (
    normalizeHandle(asString(author?.name)) ??
    normalizeHandle(asString(item["authorMeta.name"])) ??
    normalizeHandle(asString(item.name)) ??
    normalizeHandle(asString(item.uniqueId)) ??
    normalizeHandle(asString(item.input)) ??
    normalizeHandle(
      asString(author?.profileUrl)?.match(/tiktok\.com\/@([^/?#]+)/i)?.[1],
    ) ??
    normalizeHandle(
      asString(item.webVideoUrl)?.match(/tiktok\.com\/@([^/?#]+)/i)?.[1],
    )
  );
}

function displayNameFromItem(item: ApifyItem): string | undefined {
  const author = asRecord(item.authorMeta);
  return (
    asString(author?.nickName) ??
    asString(item["authorMeta.nickName"]) ??
    asString(item.nickName)
  );
}

function searchQueryOf(item: ApifyItem): string {
  return (asString(item.searchQuery) ?? "").toLowerCase();
}

function compactName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isVerified(item: ApifyItem): boolean {
  const author = asRecord(item.authorMeta);
  return author?.verified === true || item.verified === true;
}

function fansOf(item: ApifyItem): number {
  const author = asRecord(item.authorMeta);
  return (
    asNumber(author?.fans) ||
    asNumber(item.fans) ||
    asNumber(author?.heart) ||
    asNumber(item["authorMeta.fans"])
  );
}

function isExactAccountMatch(
  handleCompact: string,
  displayLower: string,
  brandCompact: string,
  brandNeedle: string,
): boolean {
  return (
    handleCompact === brandCompact || displayLower === brandNeedle
  );
}

function pickAccountForName(
  name: string,
  items: ApifyItem[],
): ResolvedTikTokAccount | null {
  const needle = name.toLowerCase().trim();
  const compact = compactName(name);
  const pool = items.filter((item) => {
    const q = searchQueryOf(item);
    return !q || q === needle;
  });
  type ScoredAccount = { account: ResolvedTikTokAccount; score: number };
  const candidates: ScoredAccount[] = [];
  for (const item of pool.length > 0 ? pool : items) {
    const handle = handleFromItem(item);
    if (!handle) continue;
    const display = displayNameFromItem(item) ?? "";
    const h = compactName(handle);
    const d = display.toLowerCase();
    if (!isExactAccountMatch(h, d, compact, needle)) continue;

    const verified = isVerified(item);
    const fans = fansOf(item);
    let score = 0;
    if (verified) score += 2;
    if (fans >= 100_000) score += 2;
    else if (fans >= 10_000) score += 1;
    candidates.push({
      account: {
        name,
        handle,
        displayName: display || undefined,
        verified: verified || undefined,
        fans: fans || undefined,
        source: "brand",
        foundVia: "search",
      },
      score,
    });
  }
  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) =>
      b.score - a.score || (b.account.fans ?? 0) - (a.account.fans ?? 0),
  );
  return candidates[0]?.account ?? null;
}

function mapItemToPost(
  item: ApifyItem,
  handle: string,
): ScrapedTikTokPost | null {
  const idRaw = item.id ?? item.awemeId;
  const id =
    (typeof idRaw === "string" && idRaw) ||
    (typeof idRaw === "number" && Number.isFinite(idRaw) ? String(idRaw) : null);
  if (!id || id === "0") return null;

  const url = tiktokVideoUrl(handle, id);

  const videoMeta = asRecord(item.videoMeta);
  const musicMeta = asRecord(item.musicMeta);
  const duration =
    asNumber(videoMeta?.duration) || asNumber(item["videoMeta.duration"]);
  const thumbnail =
    asString(videoMeta?.coverUrl) ??
    asString(item["videoMeta.coverUrl"]) ??
    asString(item.cover) ??
    "";
  const createTime =
    typeof item.createTime === "number"
      ? item.createTime * 1000
      : asString(item.createTimeISO)
        ? Date.parse(item.createTimeISO as string)
        : Date.now();
  const soundId =
    asString(musicMeta?.musicId) ?? asString(item["musicMeta.musicId"]);

  return {
    postId: id,
    url,
    thumbnail,
    caption: asString(item.text) ?? "",
    duration,
    views: asNumber(item.playCount),
    likes: asNumber(item.diggCount),
    comments: asNumber(item.commentCount),
    shares: asNumber(item.shareCount),
    soundId,
    postedAt: Number.isFinite(createTime) ? createTime : Date.now(),
  };
}

function isApifyNonRetryableStatus(status: number): boolean {
  return status === 401 || status === 402 || status === 403;
}

function isApifyTimeoutResponse(status: number, body: string): boolean {
  if (status === 408 || status === 504) {
    return true;
  }
  const lower = body.toLowerCase();
  if (lower.includes("timed-out") || lower.includes("timed out")) {
    return true;
  }
  if (lower.includes("run-failed") && lower.includes("did not succeed")) {
    return true;
  }
  try {
    const parsed = JSON.parse(body) as {
      error?: { type?: string; message?: string };
    };
    const type = parsed.error?.type?.toLowerCase() ?? "";
    const msg = parsed.error?.message?.toLowerCase() ?? "";
    if (type === "run-failed" && (msg.includes("timed") || msg.includes("did not succeed"))) {
      return true;
    }
  } catch {
    // not JSON
  }
  return false;
}

function userMessageForApifyFailure(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return "Apify API key was rejected. Set APIFY_API_KEY on Convex.";
  }
  if (status === 402) {
    return "Apify has no credits left for TikTok scrapes.";
  }
  if (isApifyTimeoutResponse(status, body)) {
    return APIFY_TIKTOK_TIMEOUT_USER_MESSAGE;
  }
  return APIFY_GENERIC_USER_MESSAGE;
}

class ApifyRunError extends Error {
  readonly retryable: boolean;
  readonly status: number;
  readonly rawBody: string;

  constructor(userMessage: string, retryable: boolean, status: number, rawBody: string) {
    super(userMessage);
    this.name = "ApifyRunError";
    this.retryable = retryable;
    this.status = status;
    this.rawBody = rawBody;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runActorOnce(
  input: Record<string, unknown>,
  timeoutSec = RUN_TIMEOUT_SEC,
): Promise<ApifyItem[]> {
  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?timeout=${timeoutSec}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apifyKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const retryable =
      !isApifyNonRetryableStatus(res.status) &&
      isApifyTimeoutResponse(res.status, text);
    const userMessage = userMessageForApifyFailure(res.status, text);
    throw new ApifyRunError(userMessage, retryable, res.status, text);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(APIFY_GENERIC_USER_MESSAGE);
  }
  return data as ApifyItem[];
}

async function runActor(
  input: Record<string, unknown>,
  onProgress?: (detail: string) => Promise<void>,
  opts?: { timeoutSec?: number; attempts?: number },
): Promise<ApifyItem[]> {
  const timeoutSec = opts?.timeoutSec ?? RUN_TIMEOUT_SEC;
  const attempts = opts?.attempts ?? RUN_ATTEMPTS;
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (onProgress) {
      await onProgress(`${TIKTOK_WAIT_DETAIL}-${attempt}`);
    }
    try {
      return await runActorOnce(input, timeoutSec);
    } catch (err) {
      if (err instanceof ApifyRunError) {
        console.error("[apify tiktok] attempt failed", {
          attempt,
          status: err.status,
          retryable: err.retryable,
          body: err.rawBody.slice(0, 800),
        });
        lastError = err;
        if (err.retryable && attempt < attempts) {
          if (onProgress) {
            await onProgress(
              attempt === 1 ? TIKTOK_RETRY_SLOW : TIKTOK_RETRY_STILL_SLOW,
            );
          }
          await sleep(RETRY_SLEEP_MS);
          continue;
        }
        throw new Error(err.message);
      }
      throw err;
    }
  }
  throw lastError ?? new Error(APIFY_GENERIC_USER_MESSAGE);
}

export function hasApifyTikTok(): boolean {
  return Boolean(process.env.APIFY_API_KEY?.trim());
}

export async function resolveTikTokAccounts(
  competitorNames: string[],
  onProgress?: (detail: string) => Promise<void>,
): Promise<ResolvedTikTokAccount[]> {
  const names = competitorNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return [];

  try {
    const searchItems = await runActor(
      {
        ...NO_MEDIA_FLAGS,
        searchQueries: names,
        searchSection: "/user",
        maxProfilesPerQuery: MAX_PROFILES_PER_QUERY,
        resultsPerPage: 1,
      },
      onProgress,
    );

    const seen = new Set<string>();
    const accounts: ResolvedTikTokAccount[] = [];
    for (const name of names) {
      const account = pickAccountForName(name, searchItems);
      if (!account) continue;
      const key = account.handle.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      accounts.push(account);
    }
    return accounts;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new Error(formatScraperError(raw));
  }
}

function addItemsToBuckets(
  byHandle: Map<string, TikTokHandleScrape>,
  items: ApifyItem[],
) {
  for (const item of items) {
    const handle = handleFromItem(item);
    if (!handle) continue;
    const bucket = byHandle.get(handle) ?? {
      handle,
      displayName: displayNameFromItem(item),
      posts: [],
    };
    if (!bucket.displayName) {
      bucket.displayName = displayNameFromItem(item);
    }
    const post = mapItemToPost(item, handle);
    if (post && !bucket.posts.some((existing) => existing.postId === post.postId)) {
      bucket.posts.push(post);
    }
    byHandle.set(handle, bucket);
  }
}

async function scrapeProfileSort(
  handles: string[],
  sorting: "latest" | "popular",
  resultsPerPage: number,
  onProgress?: (detail: string) => Promise<void>,
): Promise<ApifyItem[]> {
  if (onProgress) {
    await onProgress(
      `Loading ${sorting} ${handles.map((h) => `@${h}`).join(", ")}`,
    );
  }
  return runActor(
    {
      ...NO_MEDIA_FLAGS,
      profiles: handles,
      resultsPerPage,
      profileScrapeSections: ["videos"],
      profileSorting: sorting,
      excludePinnedPosts: false,
    },
    onProgress,
    { timeoutSec: PROFILE_TIMEOUT_SEC, attempts: PROFILE_ATTEMPTS },
  );
}

function passFailureNotice(failed: Array<"latest" | "popular">): string | undefined {
  if (failed.length === 0 || failed.length === 2) {
    return undefined;
  }
  if (failed[0] === "latest") {
    return "Latest videos timed out; list uses popular posts only.";
  }
  return "Popular videos timed out; list uses latest posts only.";
}

async function scrapeProfiles(
  accounts: { handle: string; displayName?: string }[],
  onProgress?: (detail: string) => Promise<void>,
): Promise<TikTokScrapeBatch> {
  const handles = accounts.map((account) => account.handle);
  if (handles.length === 0) return { handles: [] };

  const byHandle = new Map<string, TikTokHandleScrape>();
  for (const meta of accounts) {
    byHandle.set(meta.handle, {
      handle: meta.handle,
      displayName: meta.displayName,
      posts: [],
    });
  }

  let lastError: unknown;
  const failed: Array<"latest" | "popular"> = [];
  for (const pass of [
    { sorting: "latest" as const, resultsPerPage: LATEST_PER_PROFILE },
    { sorting: "popular" as const, resultsPerPage: POPULAR_PER_PROFILE },
  ]) {
    try {
      const items = await scrapeProfileSort(
        handles,
        pass.sorting,
        pass.resultsPerPage,
        onProgress,
      );
      addItemsToBuckets(byHandle, items);
    } catch (err) {
      lastError = err;
      failed.push(pass.sorting);
      console.error(`[apify tiktok] ${pass.sorting} scrape failed`, err);
    }
  }

  const rows = [...byHandle.values()].filter((row) => row.posts.length > 0);
  if (rows.length === 0) {
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error(APIFY_GENERIC_USER_MESSAGE);
  }
  return { handles: rows, passNotice: passFailureNotice(failed) };
}

export async function scrapeTikTokHandlesViaApify(
  handles: string[],
  onProgress?: (detail: string) => Promise<void>,
): Promise<TikTokScrapeBatch> {
  const unique = [...new Set(handles.map((h) => h.replace(/^@/, "").trim()).filter(Boolean))];
  if (unique.length === 0) return { handles: [] };
  try {
    return await scrapeProfiles(
      unique.map((handle) => ({ handle })),
      onProgress,
    );
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new Error(formatScraperError(raw));
  }
}

export async function scrapeCompetitorsOnTikTokViaApify(
  competitorNames: string[],
  onProgress?: (detail: string) => Promise<void>,
): Promise<TikTokScrapeBatch> {
  const names = competitorNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return { handles: [] };

  try {
    if (onProgress) {
      await onProgress("Searching TikTok for accounts…");
    }
    const accounts = await resolveTikTokAccounts(names, onProgress);
    if (accounts.length === 0) {
      return { handles: [] };
    }
    return await scrapeProfiles(accounts, onProgress);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new Error(formatScraperError(raw));
  }
}
