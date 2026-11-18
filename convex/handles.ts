import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const get = query({
  args: { handleId: v.id("handles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.handleId);
  },
});

export const listByBrand = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("handles")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .collect();
  },
});

export const upsertHandle = internalMutation({
  args: {
    brandId: v.id("brands"),
    platform: v.string(),
    handle: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"handles">> => {
    const normalized = args.handle.replace(/^@/, "").toLowerCase();
    const rows = await ctx.db
      .query("handles")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .collect();

    const existing = rows.find(
      (row) =>
        row.platform === args.platform &&
        row.handle.toLowerCase() === normalized,
    );

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName ?? existing.displayName,
        lastScrapedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("handles", {
      brandId: args.brandId,
      platform: args.platform,
      handle: normalized,
      displayName: args.displayName,
      isCompetitor: true,
      lastScrapedAt: now,
    });
  },
});
