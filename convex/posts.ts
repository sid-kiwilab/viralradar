import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveThumbnailUrl } from "./lib/postThumbnail";
import {
  computeBaselineViews,
  computeOutlierScore,
} from "./scoring";

const postShape = v.object({
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
  thumbnailStorageId: v.optional(v.id("_storage")),
});

export const getByBrandPlatformPostId = internalQuery({
  args: {
    brandId: v.id("brands"),
    platform: v.string(),
    postId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_brand_platform_postId", (q) =>
        q
          .eq("brandId", args.brandId)
          .eq("platform", args.platform)
          .eq("postId", args.postId),
      )
      .unique();
  },
});

export const upsertMany = internalMutation({
  args: {
    posts: v.array(postShape),
  },
  handler: async (ctx, args) => {
    const touchedHandles = new Set<Id<"handles">>();
    for (const post of args.posts) {
      const existing = await ctx.db
        .query("posts")
        .withIndex("by_brand_platform_postId", (q) =>
          q
            .eq("brandId", post.brandId)
            .eq("platform", post.platform)
            .eq("postId", post.postId),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          handleId: post.handleId,
          brandId: post.brandId,
          url: post.url,
          thumbnail: post.thumbnail,
          ...(post.thumbnailStorageId
            ? { thumbnailStorageId: post.thumbnailStorageId }
            : {}),
          caption: post.caption,
          duration: post.duration,
          views: post.views,
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          soundId: post.soundId,
          postedAt: post.postedAt,
          scrapedAt: post.scrapedAt,
        });
      } else {
        await ctx.db.insert("posts", {
          ...post,
          outlierScore: undefined,
        });
      }
      touchedHandles.add(post.handleId);
    }
    return { handleIds: [...touchedHandles] };
  },
});

export const recomputeScoresForHandle = internalMutation({
  args: { handleId: v.id("handles") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_handle", (q) => q.eq("handleId", args.handleId))
      .collect();

    const views = rows.map((row) => row.views).filter((v) => v > 0);
    const baseline = computeBaselineViews(views);

    for (const row of rows) {
      const score =
        baseline !== undefined
          ? computeOutlierScore(row.views, baseline)
          : undefined;
      await ctx.db.patch(row._id, { outlierScore: score });
    }
  },
});

/** Cap rows read before in-memory score filter (demo scale; tune when scrape volume grows). */
const RANK_POOL_MAX = 2000;
const MIN_DISPLAY_OUTLIER_SCORE = 2;
const DISPLAY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export const rankedByBrand = query({
  args: { brandId: v.id("brands"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const postedAfter = Date.now() - DISPLAY_WINDOW_MS;
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_brand_score", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(RANK_POOL_MAX);
    const filtered = rows
      .filter(
        (post) =>
          post.outlierScore != null &&
          post.outlierScore >= MIN_DISPLAY_OUTLIER_SCORE &&
          post.postedAt >= postedAfter,
      )
      .sort((a, b) => (b.outlierScore ?? 0) - (a.outlierScore ?? 0))
      .slice(0, limit);

    return Promise.all(
      filtered.map(async (post) => ({
        ...post,
        thumbnailUrl: await resolveThumbnailUrl(ctx, post),
      })),
    );
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

export const listMissingStoredThumbnails = internalQuery({
  args: { brandId: v.id("brands"), limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_brand_score", (q) => q.eq("brandId", args.brandId))
      .take(Math.min(args.limit, 200));
    return rows.filter((row) => !row.thumbnailStorageId && row.thumbnail.trim());
  },
});

export const setThumbnailStorage = internalMutation({
  args: {
    postId: v.id("posts"),
    thumbnailStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      thumbnailStorageId: args.thumbnailStorageId,
    });
  },
});

export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return null;
    }
    return {
      ...post,
      thumbnailUrl: await resolveThumbnailUrl(ctx, post),
    };
  },
});
