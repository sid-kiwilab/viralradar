"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/** Claude action: brand → competitor list. Stub until wired. */
export const infer = action({
  args: {
    name: v.string(),
    niche: v.string(),
    positioning: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    return {
      ...args,
      status: "not_implemented" as const,
      competitors: [] as string[],
    };
  },
});
