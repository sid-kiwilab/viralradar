import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import { activeScanJobForBrand } from "./lib/activeScanJob";

export const insertFromScan = internalMutation({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
    jobId: v.id("scanJobs"),
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
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!activeScanJobForBrand(job, args.brandId)) {
      return false;
    }
    const { jobId, ...row } = args;
    await ctx.db.insert("brandInferences", {
      ...row,
      jobId,
      createdAt: Date.now(),
    });
    return true;
  },
});

async function latestInferenceForJob(
  ctx: QueryCtx,
  jobId: Id<"scanJobs">,
) {
  const rows = await ctx.db
    .query("brandInferences")
    .withIndex("by_job", (q) => q.eq("jobId", jobId))
    .collect();
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export const getLatestByJob = internalQuery({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    return await latestInferenceForJob(ctx, args.jobId);
  },
});

/** Gate UI only — no raw model output or page excerpt. */
export const latestByJob = query({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    const row = await latestInferenceForJob(ctx, args.jobId);
    if (!row) {
      return null;
    }
    return {
      name: row.name,
      niche: row.niche,
      searchCategory: row.searchCategory,
      service: row.service,
      products: row.products,
      audience: row.audience,
      positioning: row.positioning,
      notThis: row.notThis,
      promptVersion: row.promptVersion,
      pageReadMs: row.pageReadMs,
      inferMs: row.inferMs,
      understandMs: row.understandMs,
    };
  },
});
