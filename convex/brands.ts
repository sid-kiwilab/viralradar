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
import { activeScanJobForBrand } from "./lib/activeScanJob";
import { parseExcludeHandlesInput } from "./lib/excludeHandles";
import { purgeBrandScanData } from "./lib/purgeBrandScan";
import {
  isShowcaseMode,
  SHOWCASE_CACHE_MISSING_MESSAGE,
  SHOWCASE_DEMO_ONLY_MESSAGE,
} from "./lib/showcaseMode";

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
    if (!activeScanJobForBrand(job, args.brandId)) {
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
  return posts.length > 0;
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
  args: {
    url: v.string(),
    excludeHandlesInput: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const url = normalizeBrandUrl(args.url);
    const excludeHandles = parseExcludeHandlesInput(args.excludeHandlesInput);
    const demoHostKey = demoHostKeyFromUrl(url);
    const showcase = isShowcaseMode();

    if (showcase && !demoHostKey) {
      throw new Error(SHOWCASE_DEMO_ONLY_MESSAGE);
    }

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
      if (showcase) {
        throw new Error(SHOWCASE_CACHE_MISSING_MESSAGE);
      }
    }

    let existing = await ctx.db
      .query("brands")
      .withIndex("by_url", (q) => q.eq("url", url))
      .unique();

    // Demo hosts can reuse a completed scan (showcase requires cache above).
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

    // Live scan: drop prior jobs/posts/handles so UI never shows stale outliers.
    // Demo hosts can skip this via cachedScanJobReturn above when cache exists.
    await purgeBrandScanData(ctx, brandId);

    const jobId = await ctx.db.insert("scanJobs", {
      brandId,
      status: "pending",
      stage: "queued",
      startedAt: Date.now(),
      ...(excludeHandles.length > 0 ? { excludeHandles } : {}),
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
