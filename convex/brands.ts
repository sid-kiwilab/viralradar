import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { hostnameLabel, normalizeBrandUrl } from "./lib/url";

export const getBrand = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.brandId);
  },
});

export const getBrandInternal = internalQuery({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.brandId);
  },
});

export const patchFromScan = internalMutation({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    name: v.string(),
    niche: v.string(),
    positioning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (
      !job ||
      job.brandId !== args.brandId ||
      (job.status !== "pending" &&
        job.status !== "running" &&
        job.status !== "waiting")
    ) {
      return;
    }
    await ctx.db.patch(args.brandId, {
      name: args.name,
      niche: args.niche,
      positioning: args.positioning,
    });
  },
});

const ACTIVE_STATUSES = new Set(["pending", "running", "waiting"]);

export const startFromUrl = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const url = normalizeBrandUrl(args.url);

    const existing = await ctx.db
      .query("brands")
      .withIndex("by_url", (q) => q.eq("url", url))
      .unique();

    const seedName = hostnameLabel(url);
    const brandId =
      existing?._id ??
      (await ctx.db.insert("brands", {
        url,
        name: seedName,
        niche: "Unknown",
        createdAt: Date.now(),
      }));

    const jobs = await ctx.db
      .query("scanJobs")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();

    const now = Date.now();
    for (const existingJob of jobs) {
      if (!ACTIVE_STATUSES.has(existingJob.status)) {
        continue;
      }
      await ctx.db.patch(existingJob._id, {
        status: "failed",
        stage: "failed",
        error: "Scan cancelled.",
        detail: undefined,
        completedAt: now,
      });
    }

    const jobId = await ctx.db.insert("scanJobs", {
      brandId,
      status: "pending",
      stage: "queued",
      startedAt: Date.now(),
    });

    const jobsAfterInsert = await ctx.db
      .query("scanJobs")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();

    const activeAfterInsert = jobsAfterInsert.filter((job) =>
      ACTIVE_STATUSES.has(job.status),
    );
    if (activeAfterInsert.length > 1) {
      await ctx.db.delete(jobId);
      throw new Error("A scan is already in progress for this brand");
    }

    await ctx.scheduler.runAfter(0, internal.actions.scanBrand.readSite, {
      brandId,
      jobId,
      url,
    });

    return { brandId, jobId };
  },
});
