import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  brandHandleResolutionValidator,
  proposedAccountValidator,
} from "./lib/proposedAccount";

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
    searchCategory: v.optional(v.string()),
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

  /** Versioned niche hashtag/keyword infer for eval (survives scan purge). */
  nicheSearches: defineTable({
    brandId: v.id("brands"),
    jobId: v.optional(v.id("scanJobs")),
    promptVersion: v.string(),
    model: v.string(),
    hashtags: v.array(v.string()),
    keywords: v.array(v.string()),
    rawOutput: v.optional(v.string()),
    inferMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_brand", ["brandId"])
    .index("by_job", ["jobId"]),

  /** Versioned competitor-discovery LLM output for eval (survives scan purge). */
  competitorDiscoveries: defineTable({
    brandId: v.id("brands"),
    jobId: v.optional(v.id("scanJobs")),
    promptVersion: v.string(),
    model: v.string(),
    source: v.union(v.literal("serp"), v.literal("memory")),
    competitors: v.array(
      v.object({
        name: v.string(),
        website: v.optional(v.string()),
        reason: v.optional(v.string()),
        kind: v.optional(v.union(v.literal("established"), v.literal("rising"))),
      }),
    ),
    queries: v.array(v.string()),
    notice: v.optional(v.string()),
    serpExcerpt: v.optional(v.string()),
    rawQueryOutput: v.optional(v.string()),
    rawExtractOutput: v.optional(v.string()),
    rawMemoryOutput: v.optional(v.string()),
    queryMs: v.optional(v.number()),
    serpMs: v.optional(v.number()),
    extractMs: v.optional(v.number()),
    verifyMs: v.optional(v.number()),
    discoverMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_brand", ["brandId"])
    .index("by_promptVersion", ["promptVersion"])
    .index("by_job", ["jobId"]),

  /** Versioned handle-resolution output for eval (survives scan purge). */
  handleResolutions: defineTable({
    brandId: v.id("brands"),
    jobId: v.optional(v.id("scanJobs")),
    promptVersion: v.string(),
    brands: v.array(brandHandleResolutionValidator),
    queries: v.array(v.string()),
    notice: v.optional(v.string()),
    serpExcerpt: v.optional(v.string()),
    siteMs: v.optional(v.number()),
    serpMs: v.optional(v.number()),
    searchMs: v.optional(v.number()),
    resolveMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_brand", ["brandId"])
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
    /** search = niche hashtag hit; profile = baseline grid (not listed on home). */
    origin: v.optional(v.union(v.literal("search"), v.literal("profile"))),
  })
    .index("by_handle", ["handleId"])
    .index("by_brand", ["brandId"])
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
    proposedAccounts: v.optional(v.array(proposedAccountValidator)),
    error: v.optional(v.string()),
    confirmedCompetitorNames: v.optional(v.array(v.string())),
    confirmedHandles: v.optional(v.array(v.string())),
    scrapeHandlesCompleted: v.optional(v.array(v.string())),
    hashtags: v.optional(v.array(v.string())),
    keywords: v.optional(v.array(v.string())),
    /** Instagram handles to omit from niche search results (owner opt-in). */
    excludeHandles: v.optional(v.array(v.string())),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_brand", ["brandId"]),
});
