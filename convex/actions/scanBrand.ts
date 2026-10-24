"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { fetchPageContent } from "../scraper/browser";
import { inferBrandFromPage } from "../discovery/brandFromUrl";
import { inferCompetitorsFromBrand } from "../discovery/competitorsFromBrand";
import { scrapeCompetitorsOnTikTok } from "../scraper/tiktok";
import { formatScraperError } from "../lib/scraperErrors";
import type { GenericActionCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

const PAGE_TEXT_MAX = 12_000;

async function isJobActive(
  ctx: GenericActionCtx<DataModel>,
  jobId: Id<"scanJobs">,
): Promise<boolean> {
  const job = await ctx.runQuery(internal.scanJobs.getJob, { jobId });
  if (!job) {
    return false;
  }
  return (
    job.status === "pending" ||
    job.status === "running" ||
    job.status === "waiting"
  );
}

async function failJob(
  ctx: GenericActionCtx<DataModel>,
  jobId: Id<"scanJobs">,
  err: unknown,
) {
  const raw = err instanceof Error ? err.message : String(err);
  await ctx.runMutation(internal.scanJobs.patch, {
    jobId,
    status: "failed",
    stage: "failed",
    error: formatScraperError(raw),
    clearDetail: true,
    completedAt: Date.now(),
  });
}

/** Step 1: read brand site and infer who they are. */
export const readSite = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.scanJobs.markRunning, {
        jobId: args.jobId,
        stage: "understand_site",
        detail: "Reading the brand site",
      });

      const pageResult = await fetchPageContent(args.url);
      if (!pageResult.ok) {
        throw new Error(pageResult.reason);
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      const { snapshot } = pageResult;
      const brandInfo = await inferBrandFromPage(
        args.url,
        snapshot.bodyText,
        snapshot.title,
        snapshot.metaDescription,
      );

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.runMutation(internal.brands.patchFromScan, {
        brandId: args.brandId,
        jobId: args.jobId,
        name: brandInfo.name,
        niche: brandInfo.niche,
        positioning: brandInfo.positioning,
      });

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        status: "waiting",
        stage: "review_brand",
        pageTextExcerpt: snapshot.bodyText.slice(0, PAGE_TEXT_MAX),
        clearDetail: true,
      });

      return { ok: true as const };
    } catch (err) {
      await failJob(ctx, args.jobId, err);
      return { ok: false as const };
    }
  },
});

/** Step 2: infer competitors (after user confirms brand). */
export const inferCompetitors = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.scanJobs.markRunning, {
        jobId: args.jobId,
        stage: "find_competitors",
        detail: "Finding competitors in your niche",
      });

      const brand = await ctx.runQuery(internal.brands.getBrandInternal, {
        brandId: args.brandId,
      });
      const job = await ctx.runQuery(internal.scanJobs.getJob, {
        jobId: args.jobId,
      });
      if (!brand || !job) {
        throw new Error("Scan job not found");
      }

      const competitors = await inferCompetitorsFromBrand({
        name: brand.name,
        niche: brand.niche,
        positioning: brand.positioning,
        pageText: job.pageTextExcerpt,
      });

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      if (competitors.length === 0) {
        throw new Error("No competitors inferred for this brand");
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        status: "waiting",
        stage: "review_competitors",
        proposedCompetitors: competitors,
        clearDetail: true,
      });

      return { ok: true as const, competitors };
    } catch (err) {
      await failJob(ctx, args.jobId, err);
      return { ok: false as const };
    }
  },
});

/** Step 3: TikTok scrape and score for user-confirmed competitors. */
export const searchTikTok = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    competitors: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.scanJobs.markRunning, {
        jobId: args.jobId,
        stage: "search_tiktok",
        detail: "Searching TikTok for competitors",
      });

      const scrapes = await scrapeCompetitorsOnTikTok(
        args.competitors,
        async (detail) => {
          await ctx.runMutation(internal.scanJobs.patch, {
            jobId: args.jobId,
            detail,
          });
        },
      );

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      if (scrapes.length === 0) {
        throw new Error("No TikTok posts found for selected competitors");
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        stage: "score",
        detail: "Scoring outlier posts",
      });

      const scrapedAt = Date.now();

      for (const scrape of scrapes) {
        if (!(await isJobActive(ctx, args.jobId))) {
          return { ok: false as const };
        }
        const handleId = await ctx.runMutation(
          internal.handles.upsertCompetitorHandle,
          {
            brandId: args.brandId,
            platform: "tiktok",
            handle: scrape.handle,
            displayName: scrape.displayName,
          },
        );

        if (scrape.posts.length === 0) continue;

        const upsert = await ctx.runMutation(internal.posts.upsertMany, {
          posts: scrape.posts.map((post) => ({
            handleId,
            brandId: args.brandId,
            platform: "tiktok",
            postId: post.postId,
            url: post.url,
            thumbnail: post.thumbnail,
            caption: post.caption,
            duration: post.duration,
            views: post.views,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            soundId: post.soundId,
            postedAt: post.postedAt,
            scrapedAt,
          })),
        });

        for (const hid of upsert.handleIds) {
          await ctx.runMutation(internal.posts.recomputeScoresForHandle, {
            handleId: hid,
          });
        }
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        status: "completed",
        stage: "done",
        clearDetail: true,
        completedAt: Date.now(),
      });

      return { ok: true as const };
    } catch (err) {
      await failJob(ctx, args.jobId, err);
      return { ok: false as const };
    }
  },
});
