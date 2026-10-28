"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { storeThumbnailFromUrl } from "../lib/storeThumbnail";

const BACKFILL_LIMIT = 60;

/** Fill Convex file storage for posts that only have expiring TikTok CDN URLs. */
export const backfillForBrand = internalAction({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    const rows = await ctx.runQuery(internal.posts.listMissingStoredThumbnails, {
      brandId: args.brandId,
      limit: BACKFILL_LIMIT,
    });
    for (const row of rows) {
      const storageId = await storeThumbnailFromUrl(ctx, row.thumbnail);
      if (!storageId) {
        continue;
      }
      await ctx.runMutation(internal.posts.setThumbnailStorage, {
        postId: row._id,
        thumbnailStorageId: storageId,
      });
    }
  },
});
