import { v } from "convex/values";

export const proposedAccountValidator = v.object({
  name: v.string(),
  handle: v.string(),
  displayName: v.optional(v.string()),
  verified: v.optional(v.boolean()),
  fans: v.optional(v.number()),
  source: v.optional(v.union(v.literal("brand"), v.literal("niche"))),
  foundVia: v.optional(v.union(v.literal("site"), v.literal("search"))),
});
