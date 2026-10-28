"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { fetchPageContent } from "../scraper/browser";
import { tiktokHandlesFromLinks } from "../scraper/tiktokLinks";
import type { ResolvedTikTokAccount } from "../scraper/tiktokTypes";
import { inferBrandFromPage } from "../discovery/brandFromUrl";
import {
  competitorReviewDetail,
  discoverCompetitors,
} from "../discovery/competitorsFromBrand";
import { scrapeCompetitorsOnTikTok } from "../scraper/tiktok";
import type { TikTokHandleScrape } from "../scraper/tiktokTypes";
import { hasApifyTikTok, resolveTikTokAccounts } from "../scraper/apifyTikTok";
import { DEMO_COMPETITOR_FIND_DETAIL } from "../../lib/demo-limits";
import { formatScraperError } from "../lib/scraperErrors";
import { storeThumbnailFromUrl } from "../lib/storeThumbnail";
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

/** Step 1: read brand site, infer brand, then infer competitors. */
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
      const pageText = snapshot.bodyText.slice(0, PAGE_TEXT_MAX);
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

      await ctx.runMutation(internal.scanJobs.markRunning, {
        jobId: args.jobId,
        stage: "find_competitors",
        detail: DEMO_COMPETITOR_FIND_DETAIL,
      });

      const competitorDiscovery = await discoverCompetitors({
        name: brandInfo.name,
        niche: brandInfo.niche,
        positioning: brandInfo.positioning,
        pageText,
      });
      const competitors = competitorDiscovery.competitors;

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      if (competitors.length === 0) {
        throw new Error("No competitor brands inferred for this brand");
      }

      const brandAccounts: ResolvedTikTokAccount[] = [];
      const competitorsWithoutTikTok: string[] = [];
      let tiktokSearchNote: string | undefined;

      if (hasApifyTikTok()) {
        await ctx.runMutation(internal.scanJobs.markRunning, {
          jobId: args.jobId,
          stage: "find_competitors",
          detail: "Searching TikTok for competitors",
        });
        const reportTikTokWait = async (detail: string) => {
          if (!(await isJobActive(ctx, args.jobId))) {
            return;
          }
          await ctx.runMutation(internal.scanJobs.patch, {
            jobId: args.jobId,
            detail,
          });
        };
        try {
          const searched = await resolveTikTokAccounts(
            competitors.map((competitor) => competitor.name),
            reportTikTokWait,
          );
          if (!(await isJobActive(ctx, args.jobId))) {
            return { ok: false as const };
          }
          const hitByName = new Map(
            searched.map((account) => [
              account.name.toLowerCase().trim(),
              account,
            ]),
          );
          for (const competitor of competitors) {
            const hit = hitByName.get(competitor.name.toLowerCase().trim());
            if (hit) {
              brandAccounts.push({
                ...hit,
                name: competitor.name,
                source: "brand",
                foundVia: "search",
              });
            } else {
              competitorsWithoutTikTok.push(competitor.name);
            }
          }
        } catch (err) {
          const raw = err instanceof Error ? err.message : String(err);
          console.error("[scanBrand] resolveTikTokAccounts failed", raw);
          tiktokSearchNote = formatScraperError(raw);
          for (const competitor of competitors) {
            competitorsWithoutTikTok.push(competitor.name);
          }
        }
      } else {
        for (const competitor of competitors) {
          if (!(await isJobActive(ctx, args.jobId))) {
            return { ok: false as const };
          }

          let siteHandle: string | undefined;
          if (competitor.website) {
            await ctx.runMutation(internal.scanJobs.markRunning, {
              jobId: args.jobId,
              stage: "find_competitors",
              detail: `Checking ${competitor.name} for a TikTok link`,
            });
            const site = await fetchPageContent(competitor.website);
            if (site.ok) {
              siteHandle = tiktokHandlesFromLinks(site.snapshot.links)[0];
            }
          }

          if (siteHandle) {
            brandAccounts.push({
              name: competitor.name,
              handle: siteHandle,
              source: "brand",
              foundVia: "site",
            });
            continue;
          }

          competitorsWithoutTikTok.push(competitor.name);
        }
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      const proposedAccounts: ResolvedTikTokAccount[] = brandAccounts.map(
        ({ sampleText: _sample, ...account }) => account,
      );

      const reviewDetailParts = [
        tiktokSearchNote,
        competitorReviewDetail(competitorDiscovery),
      ].filter(Boolean);
      const reviewDetail =
        reviewDetailParts.length > 0
          ? reviewDetailParts.join(" ")
          : undefined;

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        status: "waiting",
        stage: "review_competitors",
        proposedCompetitors: competitors.map((competitor) => competitor.name),
        competitorsWithoutTikTok,
        proposedAccounts,
        detail: reviewDetail,
      });

      return { ok: true as const, competitors };
    } catch (err) {
      await failJob(ctx, args.jobId, err);
      return { ok: false as const };
    }
  },
});

async function persistScrape(
  ctx: GenericActionCtx<DataModel>,
  args: { brandId: Id<"brands">; jobId: Id<"scanJobs"> },
  scrape: TikTokHandleScrape,
  scrapedAt: number,
): Promise<boolean> {
  if (!(await isJobActive(ctx, args.jobId))) {
    return false;
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

  if (scrape.posts.length === 0) {
    return true;
  }

  const postsWithThumbs = await Promise.all(
    scrape.posts.map(async (post) => {
      const existing = await ctx.runQuery(
        internal.posts.getByBrandPlatformPostId,
        {
          brandId: args.brandId,
          platform: "tiktok",
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
        platform: "tiktok",
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
      };
    }),
  );

  const upsert = await ctx.runMutation(internal.posts.upsertMany, {
    posts: postsWithThumbs,
  });

  for (const hid of upsert.handleIds) {
    await ctx.runMutation(internal.posts.recomputeScoresForHandle, {
      handleId: hid,
    });
  }
  return true;
}

/** Step 2: TikTok scrape and score for user-confirmed competitors. */
export const searchTikTok = internalAction({
  args: {
    brandId: v.id("brands"),
    jobId: v.id("scanJobs"),
    competitors: v.array(v.string()),
    handles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.scanJobs.markRunning, {
        jobId: args.jobId,
        stage: "search_tiktok",
        detail:
          args.handles && args.handles.length > 0
            ? "Loading TikTok profiles"
            : "Searching TikTok for competitors",
      });

      const failedHandles: string[] = [];
      const successfulScrapes: string[] = [];

      const handlesToScrape =
        args.handles
          ?.map((handle) => handle.replace(/^@/, "").trim())
          .filter(Boolean) ?? [];

      const scrapeTotal =
        handlesToScrape.length > 0
          ? handlesToScrape.length
          : args.competitors.length;

      let progressChain: Promise<void> = Promise.resolve();

      const recordAttemptFinished = (key: string): Promise<void> => {
        progressChain = progressChain.then(async () => {
          if (!(await isJobActive(ctx, args.jobId))) {
            return;
          }
          const job = await ctx.runQuery(internal.scanJobs.getJob, {
            jobId: args.jobId,
          });
          const completed = [...(job?.scrapeHandlesCompleted ?? []), key];
          await ctx.runMutation(internal.scanJobs.patch, {
            jobId: args.jobId,
            detail: `Saving results ${completed.length} of ${scrapeTotal}…`,
            scrapeHandlesCompleted: completed,
          });
        });
        return progressChain;
      };

      const scrapeBatchLabel = (count: number) =>
        count === 1
          ? "Scraping 1 competitor account…"
          : `Scraping ${count} competitor accounts…`;

      const persistFromBatch = async (
        batch: TikTokHandleScrape[],
        keys: string[],
      ) => {
        for (const key of keys) {
          if (!(await isJobActive(ctx, args.jobId))) {
            return;
          }
          const hit = batch.find(
            (row) => row.handle.toLowerCase() === key.toLowerCase(),
          );
          if (hit && hit.posts.length > 0) {
            const kept = await persistScrape(ctx, args, hit, Date.now());
            if (kept) {
              successfulScrapes.push(key);
            } else {
              failedHandles.push(key);
            }
          } else {
            failedHandles.push(key);
          }
          await recordAttemptFinished(key);
        }
      };

      const reportScrapeProgress = async (detail: string) => {
        if (!(await isJobActive(ctx, args.jobId))) {
          return;
        }
        await ctx.runMutation(internal.scanJobs.patch, {
          jobId: args.jobId,
          detail,
        });
      };

      const usingHandles = handlesToScrape.length > 0;
      const batchLabelCount = usingHandles ? handlesToScrape.length : scrapeTotal;
      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        detail: scrapeBatchLabel(batchLabelCount),
      });

      let batch: TikTokHandleScrape[] = [];
      let passNotice: string | undefined;
      let batchError = false;
      try {
        const scraped = await scrapeCompetitorsOnTikTok(
          args.competitors,
          reportScrapeProgress,
          usingHandles ? handlesToScrape : undefined,
        );
        batch = scraped.handles;
        passNotice = scraped.passNotice;
      } catch {
        batchError = true;
        const failKeys = usingHandles ? handlesToScrape : args.competitors;
        for (const key of failKeys) {
          failedHandles.push(key);
          await recordAttemptFinished(key);
        }
      }

      if (!batchError) {
        const persistKeys = usingHandles
          ? handlesToScrape
          : batch.map((row) => row.handle);
        await persistFromBatch(batch, persistKeys);
      }

      await progressChain;

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      if (successfulScrapes.length === 0) {
        throw new Error("No TikTok posts found for selected competitors");
      }

      const handleFailNote =
        failedHandles.length > 0
          ? `Could not load ${failedHandles.map((h) => `@${h.replace(/^@/, "")}`).join(", ")}.`
          : undefined;
      const completionDetail = [passNotice, handleFailNote]
        .filter(Boolean)
        .join(" ") || undefined;

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
