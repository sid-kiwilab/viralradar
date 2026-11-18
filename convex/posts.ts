import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { resolveThumbnailUrl } from "./lib/postThumbnail";
import {
  computeBaselineViews,
  computeOutlierScore,
} from "./scoring";

/** Cap rows read before in-memory score filter (demo scale; tune when scrape volume grows). */
const RANK_POOL_MAX = 2000;

const postOrigin = v.optional(
  v.union(v.literal("search"), v.literal("profile")),
);

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
  origin: postOrigin,
});

function isInstagramSearchPost(origin: string | undefined): boolean {
  return origin === "search" || origin === undefined;
}

async function loadBrandPosts(
  ctx: QueryCtx,
  brandId: Id<"brands">,
): Promise<Doc<"posts">[]> {
  return ctx.db
    .query("posts")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    .take(RANK_POOL_MAX);
}

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

/** Handles with the highest-view niche search Reels (for profile baseline scrape). */
export const topBaselineHandles = internalQuery({
  args: {
    brandId: v.id("brands"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = args.limit ?? 8;
    const rows = (await loadBrandPosts(ctx, args.brandId)).filter(
      (row) =>
        row.platform === "instagram" && isInstagramSearchPost(row.origin),
    );

    const handleIds = [...new Set(rows.map((row) => row.handleId))];
    const handleById = new Map<Id<"handles">, string>();
    for (const handleId of handleIds) {
      const handle = await ctx.db.get(handleId);
      if (handle) {
        handleById.set(handleId, handle.handle);
      }
    }

    const maxViewsByHandle = new Map<string, number>();
    for (const row of rows) {
      const handle = handleById.get(row.handleId);
      if (!handle) {
        continue;
      }
      const key = handle.toLowerCase();
      maxViewsByHandle.set(
        key,
        Math.max(maxViewsByHandle.get(key) ?? 0, row.views),
      );
    }

    return [...maxViewsByHandle.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([handle]) => handle);
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

      let origin = post.origin;
      if (
        existing?.origin === "search" &&
        post.origin === "profile"
      ) {
        origin = "search";
      }

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
          ...(origin !== undefined ? { origin } : {}),
        });
      } else {
        await ctx.db.insert("posts", {
          ...post,
          origin,
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

    const baseline = computeBaselineViews(rows);

    for (const row of rows) {
      const score =
        baseline !== undefined
          ? computeOutlierScore(row.views, baseline)
          : undefined;
      await ctx.db.patch(row._id, { outlierScore: score });
    }
  },
});

/** Per-handle median only when that handle has ≥5 scraped posts; no mixed-set fallback. */
export const recomputeScoresForBrandPlatform = internalMutation({
  args: {
    brandId: v.id("brands"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = (await loadBrandPosts(ctx, args.brandId)).filter(
      (row) => row.platform === args.platform,
    );

    const byHandle = new Map<Id<"handles">, typeof rows>();
    for (const row of rows) {
      const list = byHandle.get(row.handleId) ?? [];
      list.push(row);
      byHandle.set(row.handleId, list);
    }

    for (const handlePosts of byHandle.values()) {
      const baseline = computeBaselineViews(handlePosts);
      for (const row of handlePosts) {
        const score =
          baseline !== undefined
            ? computeOutlierScore(row.views, baseline)
            : undefined;
        await ctx.db.patch(row._id, { outlierScore: score });
      }
    }
  },
});

const MIN_DISPLAY_OUTLIER_SCORE = 2;

/** TikTok posts saved for a brand (empty-state copy). */
export const tiktokPostSummary = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    const rows = await loadBrandPosts(ctx, args.brandId);
    const count = rows.filter((post) => post.platform === "tiktok").length;
    return { count };
  },
});

export const rankedByBrand = query({
  args: { brandId: v.id("brands"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const rows = await loadBrandPosts(ctx, args.brandId);

    const tiktok = rows.filter((post) => post.platform === "tiktok");
    const scored = tiktok
      .filter(
        (post) =>
          post.outlierScore != null &&
          post.outlierScore >= MIN_DISPLAY_OUTLIER_SCORE,
      )
      .sort((a, b) => (b.outlierScore ?? 0) - (a.outlierScore ?? 0));

    const viewsOnly = tiktok
      .filter((post) => post.outlierScore == null)
      .sort((a, b) => b.views - a.views);

    const ordered = [...scored, ...viewsOnly].slice(0, limit);

    return Promise.all(
      ordered.map(async (post) => ({
        ...post,
        thumbnailUrl: await resolveThumbnailUrl(ctx, post),
      })),
    );
  },
});

export const listMissingStoredThumbnails = internalQuery({
  args: { brandId: v.id("brands"), limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("posts")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
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
