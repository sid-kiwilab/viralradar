"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { fetchPageContent } from "../scraper/browser";
import { inferBrandFromPage } from "../discovery/brandFromUrl";
import {
  hasApifyTikTok,
  resolveTikTokAccounts,
} from "../scraper/apifyTikTok";
import { scrapeTikTokHandles } from "../scraper/tiktok";
import { tiktokHandlesFromLinks } from "../scraper/tiktokLinks";
import { demoHostKeyFromUrl } from "../lib/demoBrands";
import {
  TRY_TIKTOK_HANDLE_BY_HOST,
} from "../../lib/demo-brands";
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

/** Step 1: read brand site, infer brand, then load TikTok outliers. */
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
        stage: "search_tiktok",
        detail: formatUnderstandTimings({ pageReadMs, inferMs, understandMs }),
      });

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      await ctx.scheduler.runAfter(
        0,
        internal.actions.scanBrand.searchBrandTikTok,
        {
          brandId: args.brandId,
          jobId: args.jobId,
          url: args.url,
          pageLinks: pageResult.snapshot.links,
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

/** Live path: resolve brand TikTok → scrape profiles → score. */
export const searchBrandTikTok = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    url: v.string(),
    pageLinks: v.array(v.string()),
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
        stage: "search_tiktok",
        detail: "Looking up TikTok account…",
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

      let handle: string | undefined;
      const demoHost = demoHostKeyFromUrl(args.url);
      if (demoHost && demoHost in TRY_TIKTOK_HANDLE_BY_HOST) {
        handle =
          TRY_TIKTOK_HANDLE_BY_HOST[
            demoHost as keyof typeof TRY_TIKTOK_HANDLE_BY_HOST
          ];
      }
      if (!handle) {
        handle = tiktokHandlesFromLinks(args.pageLinks)[0];
      }
      if (!handle && hasApifyTikTok()) {
        const resolved = await resolveTikTokAccounts(
          [inference.name],
          reportProgress,
        );
        handle = resolved[0]?.handle;
      }
      if (!handle) {
        throw new Error(
          scanStepFailed("find a TikTok account for this brand"),
        );
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      const scraped = await scrapeTikTokHandles([handle], reportProgress);
      const hit = scraped.handles.find(
        (row) => row.handle.toLowerCase() === handle!.toLowerCase(),
      );
      if (!hit || hit.posts.length === 0) {
        throw new Error(scanStepFailed("load TikTok posts for this brand"));
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        detail: "Saving TikTok results…",
      });

      const kept = await persistHandlePosts(
        ctx,
        { brandId: args.brandId, jobId: args.jobId },
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
