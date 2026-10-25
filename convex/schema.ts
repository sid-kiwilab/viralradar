import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  brands: defineTable({
    url: v.string(),
    name: v.string(),
    niche: v.string(),
    positioning: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_url", ["url"]),

  handles: defineTable({
    brandId: v.id("brands"),
    platform: v.string(),
    handle: v.string(),
    displayName: v.optional(v.string()),
    isCompetitor: v.boolean(),
    lastScrapedAt: v.optional(v.number()),
  })
    .index("by_brand", ["brandId"])
    .index("by_platform_handle", ["platform", "handle"]),

  posts: defineTable({
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
  })
    .index("by_handle", ["handleId"])
    .index("by_brand_score", ["brandId", "outlierScore"])
    .index("by_brand_platform_postId", ["brandId", "platform", "postId"])
    .index("by_platform_postId", ["platform", "postId"]),

  breakdowns: defineTable({
    postId: v.id("posts"),
    hook: v.string(),
    format: v.string(),
    pacing: v.string(),
    captionPattern: v.string(),
    paidAdaptation: v.string(),
    rawModelOutput: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_post", ["postId"]),

  scanJobs: defineTable({
    brandId: v.id("brands"),
    status: v.string(),
    stage: v.string(),
    detail: v.optional(v.string()),
    pageTextExcerpt: v.optional(v.string()),
    proposedCompetitors: v.optional(v.array(v.string())),
    competitorsWithoutTikTok: v.optional(v.array(v.string())),
    proposedAccounts: v.optional(
      v.array(
        v.object({
          name: v.string(),
          handle: v.string(),
          displayName: v.optional(v.string()),
          verified: v.optional(v.boolean()),
          fans: v.optional(v.number()),
          source: v.optional(v.union(v.literal("brand"), v.literal("niche"))),
          foundVia: v.optional(v.union(v.literal("site"), v.literal("search"))),
        }),
      ),
    ),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_brand", ["brandId"]),
});
