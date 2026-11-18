import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

function isTerminalJobStatus(status: string): boolean {
  return status === "failed" || status === "completed";
}

export const getJob = internalQuery({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const getById = query({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const latestByBrand = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("scanJobs")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .collect();
    return jobs.sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
  },
});

export const patch = internalMutation({
  args: {
    jobId: v.id("scanJobs"),
    status: v.optional(v.string()),
    stage: v.optional(v.string()),
    detail: v.optional(v.string()),
    error: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    keywords: v.optional(v.array(v.string())),
    completedAt: v.optional(v.number()),
    clearDetail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { jobId, clearDetail, ...fields } = args;
    const job = await ctx.db.get(jobId);
    if (!job || isTerminalJobStatus(job.status)) {
      return;
    }

    if (clearDetail) {
      await ctx.db.patch(jobId, { detail: undefined });
    }

    const patchFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patchFields[key] = value;
      }
    }
    if (Object.keys(patchFields).length > 0) {
      await ctx.db.patch(jobId, patchFields);
    }
  },
});

export const markRunning = internalMutation({
  args: {
    jobId: v.id("scanJobs"),
    stage: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || isTerminalJobStatus(job.status)) {
      return;
    }
    await ctx.db.patch(args.jobId, {
      status: "running",
      stage: args.stage,
      detail: args.detail,
      error: undefined,
    });
  },
});

/** Cancel a pending, running, or waiting step so you can scan again. */
export const abandonScan = mutation({
  args: { jobId: v.id("scanJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Scan job not found");
    }
    if (
      job.status !== "pending" &&
      job.status !== "running" &&
      job.status !== "waiting"
    ) {
      return { ok: true as const };
    }
    await ctx.db.patch(args.jobId, {
      status: "failed",
      stage: "failed",
      error: "Scan cancelled.",
      detail: undefined,
      completedAt: Date.now(),
    });
    return { ok: true as const };
  },
});
