import { v } from "convex/values";

export const handleFoundViaValidator = v.union(
  v.literal("site"),
  v.literal("serp"),
  v.literal("search"),
);

export const handleConfidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export const handleCandidateValidator = v.object({
  handle: v.string(),
  foundVia: handleFoundViaValidator,
  confidence: handleConfidenceValidator,
  reason: v.optional(v.string()),
  displayName: v.optional(v.string()),
  verified: v.optional(v.boolean()),
  fans: v.optional(v.number()),
});

export const platformResolutionValidator = v.object({
  handle: v.optional(v.string()),
  foundVia: v.optional(handleFoundViaValidator),
  confidence: v.optional(handleConfidenceValidator),
  reason: v.optional(v.string()),
  displayName: v.optional(v.string()),
  verified: v.optional(v.boolean()),
  fans: v.optional(v.number()),
  candidates: v.array(handleCandidateValidator),
});

export const brandHandleResolutionValidator = v.object({
  brandName: v.string(),
  website: v.optional(v.string()),
  instagram: platformResolutionValidator,
  tiktok: platformResolutionValidator,
});

export const proposedAccountValidator = v.object({
  name: v.string(),
  handle: v.string(),
  platform: v.optional(v.union(v.literal("tiktok"), v.literal("instagram"))),
  displayName: v.optional(v.string()),
  verified: v.optional(v.boolean()),
  fans: v.optional(v.number()),
  source: v.optional(v.union(v.literal("brand"), v.literal("niche"))),
  foundVia: v.optional(handleFoundViaValidator),
  confidence: v.optional(handleConfidenceValidator),
  reason: v.optional(v.string()),
});

/** Legacy rows omit platform — treat as TikTok. */
export function isTikTokProposedAccount(account: {
  platform?: "tiktok" | "instagram";
}): boolean {
  return account.platform === "tiktok" || account.platform == null;
}
