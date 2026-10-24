import { v } from "convex/values";
import { action, query } from "./_generated/server";

export const byPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("breakdowns")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .unique();
  },
});

/** LLM breakdown (OpenRouter). Stub until wired; cache in `breakdowns` table. */
export const getOrCreate = action({
  args: { postId: v.id("posts") },
  handler: async (_ctx, args) => {
    return {
      postId: args.postId,
      status: "not_implemented" as const,
    };
  },
});
