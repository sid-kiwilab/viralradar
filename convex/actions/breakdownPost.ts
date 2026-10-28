"use node";

import type { GenericActionCtx } from "convex/server";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { inferBreakdownFromPost } from "../discovery/breakdownFromPost";

type BreakdownActionResult = {
  status: "cached" | "created";
  breakdown: Doc<"breakdowns">;
};

const WAIT_POLL_MS = 1500;
const WAIT_MAX_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCachedBreakdown(
  ctx: GenericActionCtx<DataModel>,
  postId: Id<"posts">,
): Promise<Doc<"breakdowns"> | null> {
  const deadline = Date.now() + WAIT_MAX_MS;
  while (Date.now() < deadline) {
    const row: Doc<"breakdowns"> | null = await ctx.runQuery(
      internal.breakdowns.getByPost,
      { postId },
    );
    if (row) {
      return row;
    }
    await sleep(WAIT_POLL_MS);
  }
  return null;
}

export const getOrCreate = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, args): Promise<BreakdownActionResult> => {
    const claim = await ctx.runMutation(internal.breakdowns.claimGeneration, {
      postId: args.postId,
    });

    if (claim.status === "ready") {
      return { status: "cached", breakdown: claim.breakdown };
    }

    if (claim.status === "busy") {
      const waited = await waitForCachedBreakdown(ctx, args.postId);
      if (waited) {
        return { status: "cached", breakdown: waited };
      }
      throw new Error(
        "Breakdown is still generating. Wait a moment and try again.",
      );
    }

    try {
      const context = await ctx.runQuery(
        internal.breakdowns.contextForBreakdown,
        { postId: args.postId },
      );
      if (!context) {
        throw new Error("Post not found or missing brand/handle context");
      }

      const { brief, rawModelOutput } = await inferBreakdownFromPost(context);

      const breakdown: Doc<"breakdowns"> = await ctx.runMutation(
        internal.breakdowns.insertIfAbsent,
        {
          postId: args.postId,
          hook: brief.hook.trim(),
          format: brief.format.trim(),
          pacing: brief.pacing.trim(),
          captionPattern: brief.captionPattern.trim(),
          whyItWorked: brief.whyItWorked.trim(),
          paidAdaptation: brief.paidAdaptation.trim(),
          recreatabilityScore: brief.recreatabilityScore,
          recreatabilityReason: brief.recreatabilityReason.trim(),
          confidence: brief.confidence,
          rawModelOutput,
        },
      );

      return { status: "created", breakdown };
    } finally {
      await ctx.runMutation(internal.breakdowns.releaseGeneration, {
        postId: args.postId,
      });
    }
  },
});
