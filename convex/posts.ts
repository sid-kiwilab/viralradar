import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const savePosts = mutation({
  args: {
    posts: v.array(
      v.object({
        handleId: v.id("handles"),
        brandId: v.id("brands"),
        platform: v.string(),
        postId: v.string(),
        url: v.string(),
        thumbnail: v.string(),
        caption: v.string(),
        duration: v.number(),
        views: v.number(),
        likes: v.number(),
        comments: v.number(),
        shares: v.number(),
        soundId: v.optional(v.string()),
        postedAt: v.number(),
        scrapedAt: v.number(),
        outlierScore: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const post of args.posts) {
      ids.push(await ctx.db.insert("posts", post));
    }
    return ids;
  },
});

/** Cap rows read before in-memory score filter (demo scale; tune when scrape volume grows). */
const RANK_POOL_MAX = 2000;

export const rankedByBrand = query({
  args: { brandId: v.id("brands"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_brand_score", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(RANK_POOL_MAX);
    return rows
      .filter((post) => post.outlierScore != null)
      .sort((a, b) => (b.outlierScore ?? 0) - (a.outlierScore ?? 0))
      .slice(0, limit);
  },
});

export const byHandle = query({
  args: { handleId: v.id("handles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_handle", (q) => q.eq("handleId", args.handleId))
      .collect();
  },
});
