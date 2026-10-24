import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getBrand = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.brandId);
  },
});

export const startScan = mutation({
  args: {
    url: v.string(),
    name: v.string(),
    niche: v.string(),
    positioning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brands")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();

    const brandId =
      existing?._id ??
      (await ctx.db.insert("brands", {
        url: args.url,
        name: args.name,
        niche: args.niche,
        positioning: args.positioning,
        createdAt: Date.now(),
      }));

    await ctx.db.insert("scanJobs", {
      brandId,
      status: "pending",
      stage: "queued",
      startedAt: Date.now(),
    });

    return { brandId };
  },
});
