import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { activeScanJobForBrand } from "./lib/activeScanJob";

export const insertFromScan = internalMutation({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    promptVersion: v.string(),
    model: v.string(),
    hashtags: v.array(v.string()),
    keywords: v.array(v.string()),
    rawOutput: v.optional(v.string()),
    inferMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!activeScanJobForBrand(job, args.brandId)) {
      return false;
    }
    const { jobId, ...row } = args;
    await ctx.db.insert("nicheSearches", {
      ...row,
      jobId,
      createdAt: Date.now(),
    });
    return true;
  },
});

async function latestForJob(ctx: QueryCtx, jobId: Id<"scanJobs">) {
  const rows = await ctx.db
    .query("nicheSearches")
    .withIndex("by_job", (q) => q.eq("jobId", jobId))
    .collect();
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export const latestByJob = query({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    const row = await latestForJob(ctx, args.jobId);
    if (!row) {
      return null;
    }
    return {
      hashtags: row.hashtags,
      keywords: row.keywords,
      promptVersion: row.promptVersion,
    };
  },
});
