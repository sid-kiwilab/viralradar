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
import { inferNicheSearchQueries } from "../discovery/nicheSearchQueries";
import { filterAccountsForNiche } from "../discovery/filterTikTokAccounts";
import { scrapeCompetitorsOnTikTok } from "../scraper/tiktok";
import type { TikTokHandleScrape } from "../scraper/tiktokTypes";
import {
  discoverProposedAccounts,
  hasApifyTikTok,
  resolveTikTokAccounts,
} from "../scraper/apifyTikTok";
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
        detail: "Finding competitors in your niche",
      });

      const competitorDiscovery = await discoverCompetitors({
        name: brandInfo.name,
        niche: brandInfo.niche,
        positioning: brandInfo.positioning,
        pageText,
      });
      const competitors = competitorDiscovery.competitors;

      const nicheQueries = hasApifyTikTok()
        ? await inferNicheSearchQueries({
            name: brandInfo.name,
            niche: brandInfo.niche,
            positioning: brandInfo.positioning,
            pageText,
          })
        : [];

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      if (competitors.length === 0 && nicheQueries.length === 0) {
        throw new Error("No competitors or niche queries inferred for this brand");
      }

      const brandAccounts: ResolvedTikTokAccount[] = [];
      const competitorsWithoutTikTok: string[] = [];

      if (hasApifyTikTok()) {
        await ctx.runMutation(internal.scanJobs.markRunning, {
          jobId: args.jobId,
          stage: "find_competitors",
          detail: "Searching TikTok for competitors",
        });
        const searched = await resolveTikTokAccounts(
          competitors.map((competitor) => competitor.name),
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

      let proposedAccounts: ResolvedTikTokAccount[] = brandAccounts.map(
        ({ sampleText: _sample, ...account }) => account,
      );
      if (hasApifyTikTok() && nicheQueries.length > 0) {
        await ctx.runMutation(internal.scanJobs.markRunning, {
          jobId: args.jobId,
          stage: "find_competitors",
          detail: "Finding niche TikTok creators",
        });
        const found = await discoverProposedAccounts(
          brandAccounts,
          nicheQueries,
        );
        if (!(await isJobActive(ctx, args.jobId))) {
          return { ok: false as const };
        }
        const nicheOnly = found.filter((account) => account.source === "niche");
        let keptNiche: ResolvedTikTokAccount[] = [];
        try {
          keptNiche = await filterAccountsForNiche(nicheOnly, {
            name: brandInfo.name,
            niche: brandInfo.niche,
            positioning: brandInfo.positioning,
          });
        } catch {
          keptNiche = [];
        }
        proposedAccounts = [
          ...brandAccounts.map(({ sampleText: _sample, ...account }) => account),
          ...keptNiche,
        ];
      }

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }
      if (proposedAccounts.length === 0) {
        throw new Error(
          "No TikTok accounts found for competitors or niche search.",
        );
      }

      await ctx.runMutation(internal.scanJobs.patch, {
        jobId: args.jobId,
        status: "waiting",
        stage: "review_competitors",
        proposedCompetitors: competitors.map((competitor) => competitor.name),
        competitorsWithoutTikTok,
        proposedAccounts,
        detail: competitorReviewDetail(competitorDiscovery),
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
            detail: `Scraping competitor ${completed.length} of ${scrapeTotal}…`,
            scrapeHandlesCompleted: completed,
          });
        });
        return progressChain;
      };

      if (handlesToScrape.length > 0) {
        await Promise.allSettled(
          handlesToScrape.map(async (handle) => {
            if (!(await isJobActive(ctx, args.jobId))) {
              return;
            }
            try {
              const batch = await scrapeCompetitorsOnTikTok(
                args.competitors,
                undefined,
                [handle],
              );
              const hit =
                batch.find(
                  (row) => row.handle.toLowerCase() === handle.toLowerCase(),
                ) ?? batch[0];
              if (hit && hit.posts.length > 0) {
                const kept = await persistScrape(ctx, args, hit, Date.now());
                if (kept) {
                  successfulScrapes.push(handle);
                }
              } else {
                failedHandles.push(handle);
              }
            } catch {
              failedHandles.push(handle);
            } finally {
              await recordAttemptFinished(handle);
            }
          }),
        );
      } else {
        await Promise.allSettled(
          args.competitors.map(async (name) => {
            if (!(await isJobActive(ctx, args.jobId))) {
              return;
            }
            try {
              const batch = await scrapeCompetitorsOnTikTok(
                [name],
                undefined,
                undefined,
              );
              if (batch.length > 0 && batch[0]!.posts.length > 0) {
                const kept = await persistScrape(ctx, args, batch[0]!, Date.now());
                if (kept) {
                  successfulScrapes.push(name);
                }
              } else {
                failedHandles.push(name);
              }
            } catch {
              failedHandles.push(name);
            } finally {
              await recordAttemptFinished(name);
            }
          }),
        );
      }

      await progressChain;

      if (!(await isJobActive(ctx, args.jobId))) {
        return { ok: false as const };
      }

      if (successfulScrapes.length === 0) {
        throw new Error("No TikTok posts found for selected competitors");
      }

      const completionDetail =
        failedHandles.length > 0
          ? `Could not load ${failedHandles.map((h) => `@${h.replace(/^@/, "")}`).join(", ")}.`
          : undefined;

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
