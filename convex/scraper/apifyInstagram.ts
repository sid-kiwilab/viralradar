"use node";

import { formatScraperError } from "../lib/scraperErrors";
import { isExcludedHandle } from "../lib/excludeHandles";
import {
  reelMatchesNicheQueries,
  type NicheMatchQueries,
} from "../lib/nicheRelevance";
import type { InstagramHandleScrape } from "./instagramTypes";
import {
  hasApifyApiKey,
  instagramHashtagsFromItem,
  instagramOwnerHandleFromItem,
  mapApifyItemToInstagramPost,
  runApifyActorDataset,
  type ApifyItem,
} from "./apifyInstagramShared";

const ACTOR_ID = "apify~instagram-hashtag-scraper";
const RESULTS_PER_TERM = 8;

function addItems(
  byHandle: Map<string, InstagramHandleScrape>,
  items: ApifyItem[],
  queries: NicheMatchQueries,
  excludeHandles: string[],
) {
  for (const item of items) {
    const handle = instagramOwnerHandleFromItem(item);
    const post = mapApifyItemToInstagramPost(item);
    if (!handle || !post) {
      continue;
    }
    if (isExcludedHandle(handle, excludeHandles)) {
      continue;
    }
    if (
      !reelMatchesNicheQueries(
        post.caption,
        instagramHashtagsFromItem(item),
        queries,
      )
    ) {
      continue;
    }
    const bucket = byHandle.get(handle) ?? { handle, posts: [] };
    if (!bucket.posts.some((existing) => existing.postId === post.postId)) {
      bucket.posts.push(post);
    }
    byHandle.set(handle, bucket);
  }
}

export function hasApifyInstagram(): boolean {
  return hasApifyApiKey();
}

export async function scrapeNicheInstagramReels(
  hashtags: string[],
  keywords: string[],
  onProgress?: (detail: string) => Promise<void>,
  brand?: { searchCategory?: string; niche?: string },
  excludeHandles: string[] = [],
): Promise<InstagramHandleScrape[]> {
  if (!hasApifyInstagram()) {
    throw new Error("Set APIFY_API_KEY on the Convex deployment");
  }

  const byHandle = new Map<string, InstagramHandleScrape>();
  const queries: NicheMatchQueries = {
    hashtags,
    keywords,
    searchCategory: brand?.searchCategory,
    niche: brand?.niche,
  };

  try {
    if (hashtags.length > 0) {
      await onProgress?.(
        `Searching Instagram hashtags (${hashtags.length})…`,
      );
      const items = await runApifyActorDataset(
        ACTOR_ID,
        {
          hashtags,
          resultsType: "reels",
          resultsLimit: RESULTS_PER_TERM,
        },
        {
          logLabel: "apify instagram hashtag",
          retryDetail: "Instagram search is slow — retrying…",
          onProgress,
        },
      );
      addItems(byHandle, items, queries, excludeHandles);
    }

    if (keywords.length > 0) {
      await onProgress?.(
        `Searching Instagram keywords (${keywords.length})…`,
      );
      const items = await runApifyActorDataset(
        ACTOR_ID,
        {
          hashtags: keywords,
          keywordSearch: true,
          resultsType: "reels",
          resultsLimit: RESULTS_PER_TERM,
        },
        {
          logLabel: "apify instagram keyword",
          retryDetail: "Instagram search is slow — retrying…",
          onProgress,
        },
      );
      addItems(byHandle, items, queries, excludeHandles);
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new Error(formatScraperError(raw));
  }

  return [...byHandle.values()];
}
