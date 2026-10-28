import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  demoHostKeyFromUrl,
  urlMatchesDemoHost,
} from "./lib/demoBrands";
import { hostnameLabel, normalizeBrandUrl } from "./lib/url";

export const getBrand = query({
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

async function findBrandByDemoHost(ctx: MutationCtx, hostKey: string) {
  const brands = await ctx.db.query("brands").collect();
  return brands.find((brand) => urlMatchesDemoHost(brand.url, hostKey));
}

async function hasCachedScan(
  ctx: MutationCtx,
  brandId: Id<"brands">,
): Promise<boolean> {
  const jobs = await ctx.db
    .query("scanJobs")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    .collect();
  const hasCompleted = jobs.some((job) => job.status === "completed");
  if (!hasCompleted) {
    return false;
  }

  const posts = await ctx.db
    .query("posts")
    .withIndex("by_brand_score", (q) => q.eq("brandId", brandId))
    .collect();
  return posts.some((post) => post.outlierScore != null);
}

async function cachedScanJobReturn(
  ctx: MutationCtx,
  brandId: Id<"brands">,
): Promise<{ brandId: Id<"brands">; jobId: Id<"scanJobs"> } | null> {
  if (!(await hasCachedScan(ctx, brandId))) {
    return null;
  }
  const jobs = await ctx.db
    .query("scanJobs")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    .collect();
  const completedJob = jobs
    .filter((job) => job.status === "completed")
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!completedJob) {
    return null;
  }
  return { brandId, jobId: completedJob._id };
}

export const startFromUrl = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const url = normalizeBrandUrl(args.url);
    const demoHostKey = demoHostKeyFromUrl(url);

    if (demoHostKey) {
      const cachedBrand = await findBrandByDemoHost(ctx, demoHostKey);
      if (cachedBrand) {
        const hit = await cachedScanJobReturn(ctx, cachedBrand._id);
        if (hit) {
          await ctx.scheduler.runAfter(
            0,
            internal.actions.thumbnails.backfillForBrand,
            { brandId: hit.brandId },
          );
          return hit;
        }
      }
    }

    let existing = await ctx.db
      .query("brands")
      .withIndex("by_url", (q) => q.eq("url", url))
      .unique();

    // Only Try demo hosts (Gymshark, Duolingo, Oatly) reuse a completed scan.
    if (!existing && demoHostKey) {
      existing = (await findBrandByDemoHost(ctx, demoHostKey)) ?? null;
    }

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
