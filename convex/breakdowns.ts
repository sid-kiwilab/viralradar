import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

const STALE_CLAIM_MS = 10 * 60 * 1000;

async function breakdownByPost(ctx: QueryCtx, postId: Id<"posts">) {
  return await ctx.db
    .query("breakdowns")
    .withIndex("by_post", (q) => q.eq("postId", postId))
    .unique();
}

export const getByPost = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => breakdownByPost(ctx, args.postId),
});

export const byPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => breakdownByPost(ctx, args.postId),
});

export const contextForBreakdown = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return null;
    }

    const brand = await ctx.db.get(post.brandId);
    const handle = await ctx.db.get(post.handleId);
    if (!brand || !handle) {
      return null;
    }

    const siblings = await ctx.db
      .query("posts")
      .withIndex("by_handle", (q) => q.eq("handleId", post.handleId))
      .collect();

    const siblingRows = siblings
      .filter((row) => row._id !== post._id)
      .sort((a, b) => b.postedAt - a.postedAt)
      .slice(0, 12)
      .map((row) => ({
        caption: row.caption.slice(0, 500),
        duration: row.duration,
        views: row.views,
        outlierScore: row.outlierScore,
      }));

    const baselineViews =
      post.outlierScore != null && post.outlierScore > 0
        ? Math.round(post.views / post.outlierScore)
        : undefined;

    return {
      post: {
        caption: post.caption.slice(0, 500),
        duration: post.duration,
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        outlierScore: post.outlierScore,
        soundId: post.soundId,
      },
      brand: {
        name: brand.name,
        niche: brand.niche,
        positioning: brand.positioning,
      },
      handle: {
        handle: handle.handle,
        displayName: handle.displayName,
      },
      baselineViews,
      siblings: siblingRows,
    };
  },
});

export const claimGeneration = internalMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const existing = await breakdownByPost(ctx, args.postId);
    if (existing) {
      return { status: "ready" as const, breakdown: existing };
    }

    const claim = await ctx.db
      .query("breakdownGenerations")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .unique();

    if (claim) {
      if (Date.now() - claim.startedAt > STALE_CLAIM_MS) {
        await ctx.db.delete(claim._id);
      } else {
        return { status: "busy" as const };
      }
    }

    await ctx.db.insert("breakdownGenerations", {
      postId: args.postId,
      startedAt: Date.now(),
    });
    return { status: "claimed" as const };
  },
});

export const releaseGeneration = internalMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const claim = await ctx.db
      .query("breakdownGenerations")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .unique();
    if (claim) {
      await ctx.db.delete(claim._id);
    }
  },
});

export const insertIfAbsent = internalMutation({
  args: {
    postId: v.id("posts"),
    hook: v.string(),
    format: v.string(),
    pacing: v.string(),
    captionPattern: v.string(),
    whyItWorked: v.string(),
    paidAdaptation: v.string(),
    rawModelOutput: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await breakdownByPost(ctx, args.postId);

    if (existing) {
      return existing;
    }

    const id = await ctx.db.insert("breakdowns", {
      postId: args.postId,
      hook: args.hook,
      format: args.format,
      pacing: args.pacing,
      captionPattern: args.captionPattern,
      whyItWorked: args.whyItWorked,
      paidAdaptation: args.paidAdaptation,
      rawModelOutput: args.rawModelOutput,
      createdAt: Date.now(),
    });

    const row = await ctx.db.get(id);
    if (!row) {
      throw new Error("Failed to read breakdown after insert");
    }
    return row;
  },
});
