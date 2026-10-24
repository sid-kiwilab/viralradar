"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/** Orchestrates URL → discovery → scrape → score. Stub until pipeline ships. */
export const run = action({
  args: { brandId: v.id("brands") },
  handler: async (_ctx, args) => {
    return {
      brandId: args.brandId,
      status: "not_implemented" as const,
    };
  },
});
