import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { demoHostKeyFromUrl, DEMO_BRAND_HOSTS } from "./lib/demoBrands";

async function purgeBrandScanData(
  ctx: MutationCtx,
  brandId: Id<"brands">,
): Promise<void> {
  const posts = await ctx.db
    .query("posts")
    .withIndex("by_brand_score", (q) => q.eq("brandId", brandId))
    .collect();

  for (const post of posts) {
    for (const gen of await ctx.db
      .query("breakdownGenerations")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect()) {
      await ctx.db.delete(gen._id);
    }
    for (const row of await ctx.db
      .query("breakdowns")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect()) {
      await ctx.db.delete(row._id);
    }
    if (post.thumbnailStorageId) {
      await ctx.storage.delete(post.thumbnailStorageId);
    }
    await ctx.db.delete(post._id);
  }

  for (const handle of await ctx.db
    .query("handles")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    .collect()) {
    await ctx.db.delete(handle._id);
  }

  for (const job of await ctx.db
    .query("scanJobs")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    .collect()) {
    await ctx.db.delete(job._id);
  }
}

/** Wipe Gymshark / Duolingo / Oatly scan cache so the next Fast scan runs live. */
export const clearTryBrandCaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const brands = (await ctx.db.query("brands").collect()).filter(
      (brand) => demoHostKeyFromUrl(brand.url) !== null,
    );

    const removed: { name: string; url: string }[] = [];
    for (const brand of brands) {
      await purgeBrandScanData(ctx, brand._id);
      await ctx.db.delete(brand._id);
      removed.push({ name: brand.name, url: brand.url });
    }

    return {
      brandsRemoved: removed.length,
      brands: removed,
      hosts: [...DEMO_BRAND_HOSTS],
    };
  },
});
