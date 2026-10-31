import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import { activeScanJobForBrand } from "./lib/activeScanJob";

const competitorRow = v.object({
  name: v.string(),
  website: v.optional(v.string()),
  reason: v.optional(v.string()),
});

export const insertFromScan = internalMutation({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    promptVersion: v.string(),
    model: v.string(),
    source: v.union(v.literal("serp"), v.literal("memory")),
    competitors: v.array(competitorRow),
    queries: v.array(v.string()),
    notice: v.optional(v.string()),
    serpExcerpt: v.optional(v.string()),
    rawQueryOutput: v.optional(v.string()),
    rawExtractOutput: v.optional(v.string()),
    rawMemoryOutput: v.optional(v.string()),
    queryMs: v.optional(v.number()),
    serpMs: v.optional(v.number()),
    extractMs: v.optional(v.number()),
    discoverMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!activeScanJobForBrand(job, args.brandId)) {
      return false;
    }
    const { jobId, ...row } = args;
    await ctx.db.insert("competitorDiscoveries", {
      ...row,
      jobId,
      createdAt: Date.now(),
    });
    return true;
  },
});

async function latestDiscoveryForJob(
  ctx: QueryCtx,
  jobId: Id<"scanJobs">,
) {
  const rows = await ctx.db
    .query("competitorDiscoveries")
    .withIndex("by_job", (q) => q.eq("jobId", jobId))
    .collect();
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export const getLatestByJob = internalQuery({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    return await latestDiscoveryForJob(ctx, args.jobId);
  },
});

/** Gate UI only — no raw model output or SERP excerpt. */
export const latestByJob = query({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    const row = await latestDiscoveryForJob(ctx, args.jobId);
    if (!row) {
      return null;
    }
    return {
      promptVersion: row.promptVersion,
      source: row.source,
      competitors: row.competitors,
      notice: row.notice,
      queryMs: row.queryMs,
      serpMs: row.serpMs,
      extractMs: row.extractMs,
      discoverMs: row.discoverMs,
    };
  },
});
