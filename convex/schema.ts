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

  /** Versioned brand-understanding LLM output for eval (survives scan purge). */
  brandInferences: defineTable({
    brandId: v.id("brands"),
    url: v.string(),
    jobId: v.optional(v.id("scanJobs")),
    promptVersion: v.string(),
    model: v.string(),
    name: v.string(),
    niche: v.string(),
    service: v.string(),
    products: v.array(v.string()),
    audience: v.string(),
    positioning: v.optional(v.string()),
    notThis: v.string(),
    rawModelOutput: v.string(),
    pageTextExcerpt: v.string(),
    pageReadMs: v.optional(v.number()),
    inferMs: v.optional(v.number()),
    understandMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_brand", ["brandId"])
    .index("by_url", ["url"])
    .index("by_promptVersion", ["promptVersion"])
    .index("by_job", ["jobId"]),

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
    thumbnailStorageId: v.optional(v.id("_storage")),
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
    whyItWorked: v.string(),
    paidAdaptation: v.string(),
    recreatabilityScore: v.optional(v.number()),
    recreatabilityReason: v.optional(v.string()),
    confidence: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    rawModelOutput: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_post", ["postId"]),

  /** In-flight breakdown generation lock (one OpenRouter call per post). */
  breakdownGenerations: defineTable({
    postId: v.id("posts"),
    startedAt: v.number(),
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
    confirmedHandles: v.optional(v.array(v.string())),
    scrapeHandlesCompleted: v.optional(v.array(v.string())),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_brand", ["brandId"]),
});
