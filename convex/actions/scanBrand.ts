"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { fetchPageContent } from "../scraper/browser";
import { inferBrandFromPage } from "../discovery/brandFromUrl";
import { inferNicheSearchQueries } from "../discovery/nicheSearchQueries";
import { scrapeNicheInstagramReels } from "../scraper/apifyInstagram";
import { scrapeInstagramProfileReels } from "../scraper/apifyInstagramProfile";
import { scrapeTikTokHandles } from "../scraper/tiktok";
import { formatUnderstandTimings } from "../../lib/formatTimings";
import { scanStepFailed } from "../../lib/scanRescan";
import { formatScraperError } from "../lib/scraperErrors";
import { storeThumbnailFromUrl } from "../lib/storeThumbnail";
import type { GenericActionCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

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

/** Step 1: read brand site, infer brand, then scrape niche Reels. */
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

      const pageReadStart = Date.now();
      const pageResult = await fetchPageContent(args.url);
      const pageReadMs = Date.now() - pageReadStart;
      if (!pageResult.ok) {
        throw new Error(pageResult.reason);
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      const { snapshot } = pageResult;
      const inferStart = Date.now();
      const brandFromPage = await inferBrandFromPage(
        args.url,
        snapshot.bodyText,
        snapshot.title,
        snapshot.metaDescription,
      );
      const inferMs = Date.now() - inferStart;
      const understandMs = pageReadMs + inferMs;
      const brandInfo = brandFromPage.inference;

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

      const inserted = await ctx.runMutation(
        internal.brandInferences.insertFromScan,
        {
          brandId: args.brandId,
          url: args.url,
          jobId: args.jobId,
          promptVersion: brandFromPage.promptVersion,
          model: brandFromPage.model,
          name: brandInfo.name,
          niche: brandInfo.niche,
          searchCategory: brandInfo.searchCategory,
          service: brandInfo.service,
          products: brandInfo.products,
          audience: brandInfo.audience,
          positioning: brandInfo.positioning,
          notThis: brandInfo.notThis,
          rawModelOutput: brandFromPage.rawModelOutput,
          pageTextExcerpt: brandFromPage.pageTextExcerpt,
          pageReadMs,
          inferMs,
          understandMs,
        },
      );

      if (!inserted) {
        return { ok: false as const };
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        stage: "find_niche_queries",
        detail: formatUnderstandTimings({ pageReadMs, inferMs, understandMs }),
      });

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.scheduler.runAfter(
        0,
        internal.actions.scanBrand.scrapeNicheReels,
        {
          brandId: args.brandId,
          jobId: args.jobId,
        },
      );

      return { ok: true as const };
    } catch (err) {
      await failJob(ctx, args.jobId, err);
      return { ok: false as const };
    }
  },
});

type PersistablePost = {
  postId: string;
  url: string;
  thumbnail: string;
  caption: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  postedAt: number;
  soundId?: string;
};

async function persistHandlePosts(
  ctx: GenericActionCtx<DataModel>,
  args: { brandId: Id<"brands">; jobId: Id<"scanJobs"> },
  scrape: { handle: string; displayName?: string; posts: PersistablePost[] },
  platform: "instagram" | "tiktok",
  scrapedAt: number,
  options?: {
    origin?: "search" | "profile";
    recomputeHandleScores?: boolean;
  },
): Promise<boolean> {
  const origin = options?.origin;
  const recomputeHandleScores = options?.recomputeHandleScores ?? false;
  if (!(await isJobActive(ctx, args.jobId))) {
    return false;
  }
  const handleId = await ctx.runMutation(internal.handles.upsertHandle, {
    brandId: args.brandId,
    platform,
    handle: scrape.handle,
    displayName: scrape.displayName,
  });

  if (scrape.posts.length === 0) {
    return true;
  }

  const postsWithThumbs = await Promise.all(
    scrape.posts.map(async (post) => {
      const existing = await ctx.runQuery(
        internal.posts.getByBrandPlatformPostId,
        {
          brandId: args.brandId,
          platform,
          postId: post.postId,
        },
      );
      let thumbnailStorageId = existing?.thumbnailStorageId;
      const freshId = await storeThumbnailFromUrl(ctx, post.thumbnail);
      if (freshId) {
        thumbnailStorageId = freshId;
      }
      return {
        handleId,
        brandId: args.brandId,
        platform,
        postId: post.postId,
        url: post.url,
        thumbnail: post.thumbnail,
        thumbnailStorageId,
        caption: post.caption,
        duration: post.duration,
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        soundId: post.soundId,
        postedAt: post.postedAt,
        scrapedAt,
        origin,
      };
    }),
  );

  const upsert = await ctx.runMutation(internal.posts.upsertMany, {
    posts: postsWithThumbs,
  });

  if (recomputeHandleScores) {
    for (const hid of upsert.handleIds) {
      await ctx.runMutation(internal.posts.recomputeScoresForHandle, {
        handleId: hid,
      });
    }
  }
  return true;
}

/** Live path: niche hashtags/keywords → Instagram Reels → score. */
export const scrapeNicheReels = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
  },
  handler: async (ctx, args) => {
    try {
      const inference = await ctx.runQuery(
        internal.brandInferences.getLatestByJob,
        { jobId: args.jobId },
      );
      if (!inference) {
        throw new Error("No brand understanding for this scan. Scan again.");
      }

      await ctx.runMutation(internal.scanJobs.markRunning, {
        jobId: args.jobId,
        stage: "find_niche_queries",
        detail: `Finding Instagram searches for ${inference.niche}…`,
      });

      const queryStarted = Date.now();
      const queries = await inferNicheSearchQueries({
        name: inference.name,
        niche: inference.niche,
        searchCategory: inference.searchCategory,
        service: inference.service,
        products: inference.products,
        audience: inference.audience,
        positioning: inference.positioning,
        notThis: inference.notThis,
      });
      const inferMs = Date.now() - queryStarted;

      if (queries.hashtags.length === 0 && queries.keywords.length === 0) {
        throw new Error(scanStepFailed("find Instagram searches for this niche"));
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.runMutation(internal.nicheSearches.insertFromScan, {
        brandId: args.brandId,
        jobId: args.jobId,
        promptVersion: queries.promptVersion,
        model: queries.model,
        hashtags: queries.hashtags,
        keywords: queries.keywords,
        rawOutput: queries.raw,
        inferMs,
      });

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        hashtags: queries.hashtags,
        keywords: queries.keywords,
        stage: "search_reels",
        detail: `Scanning ${inference.niche} on Instagram…`,
      });

      const reportProgress = async (detail: string) => {
        if (!(await isJobActive(ctx, args.jobId))) {
          return;
        }
        await ctx.runMutation(internal.scanJobs.patch, {
          jobId: args.jobId,
          detail,
        });
      };

      const job = await ctx.runQuery(internal.scanJobs.getJob, {
        jobId: args.jobId,
      });
      const excludeHandles = job?.excludeHandles ?? [];

      const handles = await scrapeNicheInstagramReels(
        queries.hashtags,
        queries.keywords,
        reportProgress,
        {
          searchCategory: inference.searchCategory,
          niche: inference.niche,
        },
        excludeHandles,
      );

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      const scrapedAt = Date.now();
      let saved = 0;
      for (const scrape of handles) {
        const kept = await persistHandlePosts(
          ctx,
          args,
          scrape,
          "instagram",
          scrapedAt,
          { origin: "search" },
        );
        if (kept && scrape.posts.length > 0) {
          saved += scrape.posts.length;
        }
      }

      if (saved === 0) {
        throw new Error(scanStepFailed("find Instagram Reels in this niche"));
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.scheduler.runAfter(
        0,
        internal.actions.scanBrand.scrapeHandleBaselines,
        {
          brandId: args.brandId,
          jobId: args.jobId,
        },
      );

      return { ok: true as const };
    } catch (err) {
      await failJob(ctx, args.jobId, err);
      return { ok: false as const };
    }
  },
});

/** Profile Reels pass for per-handle baselines, then score and complete. */
export const scrapeHandleBaselines = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
  },
  handler: async (ctx, args) => {
    try {
      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      const handles = await ctx.runQuery(internal.posts.topBaselineHandles, {
        brandId: args.brandId,
      });

      const reportProgress = async (detail: string) => {
        if (!(await isJobActive(ctx, args.jobId))) {
          return;
        }
        await ctx.runMutation(internal.scanJobs.patch, {
          jobId: args.jobId,
          detail,
        });
      };

      if (handles.length > 0) {
        await ctx.runMutation(internal.scanJobs.patch, {
          jobId: args.jobId,
          stage: "search_reels",
          detail: `Loading creator baselines (${handles.length})…`,
        });

        try {
          const profileScrapes = await scrapeInstagramProfileReels(
            handles,
            reportProgress,
          );
          const scrapedAt = Date.now();
          for (const scrape of profileScrapes) {
            await persistHandlePosts(
              ctx,
              args,
              scrape,
              "instagram",
              scrapedAt,
              { origin: "profile" },
            );
          }
        } catch (err) {
          console.error("[scanBrand] profile baseline scrape failed", err);
          await reportProgress(
            "Some creator baselines could not load — scoring with what we have…",
          );
        }
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        stage: "score",
        detail: "Scoring outlier Reels",
      });

      await ctx.runMutation(internal.posts.recomputeScoresForBrandPlatform, {
        brandId: args.brandId,
        platform: "instagram",
      });

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        status: "completed",
        stage: "done",
        detail: undefined,
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

/** Dev CLI: scrape one Try brand TikTok profile for Fast-scan cache. */
export const seedTryTikTok = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    handle: v.string(),
  },
  handler: async (ctx, args) => {
    const handle = args.handle.replace(/^@/, "").trim();
    if (!handle) {
      throw new Error("TikTok handle is required");
    }

    try {
      await ctx.runMutation(internal.scanJobs.markRunning, {
        jobId: args.jobId,
        stage: "search_tiktok",
        detail: `Loading @${handle} on TikTok…`,
      });

      const reportScrapeProgress = async (detail: string) => {
        if (!(await isJobActive(ctx, args.jobId))) {
          return;
        }
        await ctx.runMutation(internal.scanJobs.patch, {
          jobId: args.jobId,
          detail,
        });
      };

      const scraped = await scrapeTikTokHandles([handle], reportScrapeProgress);
      const hit = scraped.handles.find(
        (row) => row.handle.toLowerCase() === handle.toLowerCase(),
      );

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      if (!hit || hit.posts.length === 0) {
        throw new Error(`No TikTok posts found for @${handle}`);
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        detail: "Saving TikTok results…",
      });

      const kept = await persistHandlePosts(
        ctx,
        args,
        hit,
        "tiktok",
        Date.now(),
        { recomputeHandleScores: true },
      );
      if (!kept) {
        return { ok: false as const };
      }

      const completionDetail = scraped.passNotice;

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        stage: "score",
        detail: completionDetail ?? "Scoring outlier posts",
        clearDetail: false,
      });

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        status: "completed",
        stage: "done",
        detail: completionDetail,
        clearDetail: !completionDetail,
        completedAt: Date.now(),
      });

      return { ok: true as const };
    } catch (err) {
      await failJob(ctx, args.jobId, err);
      return { ok: false as const };
    }
  },
});
