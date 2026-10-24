import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByBrand = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("handles")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .collect();
  },
});

export const addHandle = mutation({
  args: {
    brandId: v.id("brands"),
    platform: v.string(),
    handle: v.string(),
    displayName: v.optional(v.string()),
    isCompetitor: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("handles", {
      brandId: args.brandId,
      platform: args.platform,
      handle: args.handle,
      displayName: args.displayName,
      isCompetitor: args.isCompetitor,
    });
  },
});
