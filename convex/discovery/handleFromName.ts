"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/** Claude + search: display name → platform handle. Stub until wired. */
export const resolve = action({
  args: {
    platform: v.string(),
    name: v.string(),
  },
  handler: async (_ctx, args) => {
    return {
      ...args,
      status: "not_implemented" as const,
      handle: null as string | null,
    };
  },
});
