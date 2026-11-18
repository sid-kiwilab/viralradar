import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Remove jobs, handles, posts, breakdowns, and post thumbnails for one brand. */
export async function purgeBrandScanData(
  ctx: MutationCtx,
  brandId: Id<"brands">,
): Promise<void> {
  const posts = await ctx.db
    .query("posts")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
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
