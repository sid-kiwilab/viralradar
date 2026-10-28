import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** Prefer Convex-stored cover; fall back to TikTok CDN URL from scrape. */
export async function resolveThumbnailUrl(
  ctx: QueryCtx,
  post: Doc<"posts">,
): Promise<string> {
  if (post.thumbnailStorageId) {
    const stored = await ctx.storage.getUrl(post.thumbnailStorageId);
    if (stored) {
      return stored;
    }
  }
  return post.thumbnail;
}
