"use node";

import { formatScraperError } from "../lib/scraperErrors";
import { instagramProfileReelsUrl } from "../lib/instagramUrls";
import type { InstagramHandleScrape } from "./instagramTypes";
import {
  asString,
  instagramOwnerHandleFromItem,
  mapApifyItemToInstagramPost,
  runApifyActorDataset,
  type ApifyItem,
} from "./apifyInstagramShared";

const ACTOR_ID = "apify~instagram-scraper";
export const PROFILE_REELS_PER_HANDLE = 20;
export const MAX_BASELINE_HANDLES = 8;

function resolveHandleForItem(
  item: ApifyItem,
  handleSet: Map<string, string>,
): string | null {
  const inputUrl = asString(item.inputUrl) ?? asString(item.url) ?? "";
  let matchedKey: string | undefined;
  for (const key of handleSet.keys()) {
    if (inputUrl.toLowerCase().includes(`/${key}/`)) {
      matchedKey = key;
      break;
    }
  }

  const ownerKey = instagramOwnerHandleFromItem(item);
  if (ownerKey && handleSet.has(ownerKey)) {
    return handleSet.get(ownerKey)!;
  }
  if (matchedKey) {
    return handleSet.get(matchedKey)!;
  }
  return null;
}

function bucketItemsByHandle(
  handles: string[],
  items: ApifyItem[],
): InstagramHandleScrape[] {
  const handleSet = new Map(
    handles.map((h) => [h.toLowerCase(), h.replace(/^@/, "").trim()]),
  );
  const byHandle = new Map<string, InstagramHandleScrape>();

  for (const item of items) {
    const post = mapApifyItemToInstagramPost(item, { reelsOnly: true });
    if (!post) {
      continue;
    }
    const handle = resolveHandleForItem(item, handleSet);
    if (!handle) {
      continue;
    }
    const key = handle.toLowerCase();
    const bucket = byHandle.get(key) ?? { handle, posts: [] };
    if (!bucket.posts.some((existing) => existing.postId === post.postId)) {
      bucket.posts.push(post);
    }
    byHandle.set(key, bucket);
  }

  return [...byHandle.values()];
}

/** Latest Reels per profile handle (batched directUrls). */
export async function scrapeInstagramProfileReels(
  handles: string[],
  onProgress?: (detail: string) => Promise<void>,
): Promise<InstagramHandleScrape[]> {
  const unique = [
    ...new Set(
      handles.map((h) => h.replace(/^@/, "").trim()).filter(Boolean),
    ),
  ].slice(0, MAX_BASELINE_HANDLES);
  if (unique.length === 0) {
    return [];
  }

  const directUrls = unique.map((h) => instagramProfileReelsUrl(h));

  await onProgress?.(
    `Loading recent Reels for ${unique.length} creator${unique.length === 1 ? "" : "s"}…`,
  );

  try {
    const items = await runApifyActorDataset(
      ACTOR_ID,
      {
        directUrls,
        resultsType: "reels",
        resultsLimit: PROFILE_REELS_PER_HANDLE,
      },
      {
        logLabel: "apify instagram profile",
        retryDetail: "Instagram profile load is slow — retrying…",
        onProgress,
      },
    );
    return bucketItemsByHandle(unique, items);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new Error(formatScraperError(raw));
  }
}
