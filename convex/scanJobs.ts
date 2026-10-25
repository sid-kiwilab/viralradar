import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { proposedAccountValidator } from "./lib/proposedAccount";

function isTerminalJobStatus(status: string): boolean {
  return status === "failed" || status === "completed";
}

export const getJob = internalQuery({
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
      .order("desc")
      .take(1);
    return jobs[0] ?? null;
  },
});

export const patch = internalMutation({
  args: {
    jobId: v.id("scanJobs"),
    status: v.optional(v.string()),
    stage: v.optional(v.string()),
    detail: v.optional(v.string()),
    pageTextExcerpt: v.optional(v.string()),
    proposedCompetitors: v.optional(v.array(v.string())),
    competitorsWithoutTikTok: v.optional(v.array(v.string())),
    proposedAccounts: v.optional(v.array(proposedAccountValidator)),
    error: v.optional(v.string()),
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

function requireWaitingJob(
  job: Doc<"scanJobs"> | null,
  stage: string,
): Doc<"scanJobs"> {
  if (!job || job.status !== "waiting" || job.stage !== stage) {
    throw new Error("This step is not ready");
  }
  return job;
}

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

export const searchConfirmedCompetitors = mutation({
  args: {
    jobId: v.id("scanJobs"),
    competitors: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const job = requireWaitingJob(
      await ctx.db.get(args.jobId),
      "review_competitors",
    );

    const selected = args.competitors.map((n) => n.trim()).filter(Boolean);
    if (selected.length === 0) {
      throw new Error("Select at least one competitor");
    }

    const accounts = (job.proposedAccounts ?? []).filter(
      (account) =>
        selected.includes(account.handle) || selected.includes(account.name),
    );
    const handles = accounts.map((account) => account.handle);
    const names =
      accounts.length > 0 ? accounts.map((account) => account.name) : selected;

    await ctx.db.patch(args.jobId, {
      status: "pending",
      stage: "search_tiktok",
      detail:
        handles.length > 0
          ? "Loading TikTok profiles"
          : "Searching TikTok for competitors",
    });

    await ctx.scheduler.runAfter(0, internal.actions.scanBrand.searchTikTok, {
      brandId: job.brandId,
      jobId: args.jobId,
      competitors: names,
      handles: handles.length > 0 ? handles : undefined,
    });
  },
});
