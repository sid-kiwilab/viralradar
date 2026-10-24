"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/** LLM action (OpenRouter): brand URL → name, niche, positioning. Use createOpenRouterClient() when wired. */
export const infer = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    return {
      url: args.url,
      status: "not_implemented" as const,
    };
  },
});
