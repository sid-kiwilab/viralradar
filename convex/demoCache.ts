import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  demoHostKeyFromUrl,
  DEMO_BRAND_HOSTS,
  urlMatchesDemoHost,
} from "./lib/demoBrands";

async function purgeBrandScanData(
  ctx: MutationCtx,
  brandId: Id<"brands">,
): Promise<void> {
  const posts = await ctx.db
    .query("posts")
    .withIndex("by_brand_score", (q) => q.eq("brandId", brandId))
    .collect();

  for (const post of posts) {
    for (const gen of await ctx.db
      .query("breakdownGenerations")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect()) {
      await ctx.db.delete(gen._id);
    }
    for (const row of await ctx.db
      .query("breakdowns")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect()) {
      await ctx.db.delete(row._id);
    }
    if (post.thumbnailStorageId) {
      await ctx.storage.delete(post.thumbnailStorageId);
    }
    await ctx.db.delete(post._id);
  }

  for (const handle of await ctx.db
    .query("handles")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    .collect()) {
    await ctx.db.delete(handle._id);
  }

  for (const job of await ctx.db
    .query("scanJobs")
    .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    .collect()) {
    await ctx.db.delete(job._id);
  }
}

function normalizeTryHost(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const bare = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    ?.toLowerCase();
  if (bare && DEMO_BRAND_HOSTS.has(bare)) {
    return bare;
  }
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return demoHostKeyFromUrl(withProtocol);
  } catch {
    return null;
  }
}

async function clearTryBrandByHostKey(
  ctx: MutationCtx,
  hostKey: string,
): Promise<{ name: string; url: string }[]> {
  const brands = (await ctx.db.query("brands").collect()).filter((brand) =>
    urlMatchesDemoHost(brand.url, hostKey),
  );

  const removed: { name: string; url: string }[] = [];
  for (const brand of brands) {
    await purgeBrandScanData(ctx, brand._id);
    await ctx.db.delete(brand._id);
    removed.push({ name: brand.name, url: brand.url });
  }
  return removed;
}

/** Wipe one Try host (gymshark.com, duolingo.com, oatly.com) on dev (CLI only). */
export const clearTryBrandCacheByHost = internalMutation({
  args: { host: v.string() },
  handler: async (ctx, args) => {
    const hostKey = normalizeTryHost(args.host);
    if (!hostKey) {
      throw new Error(
        "host must be a Try brand: gymshark.com, duolingo.com, or oatly.com",
      );
    }
    const brands = await clearTryBrandByHostKey(ctx, hostKey);
    return { host: hostKey, brandsRemoved: brands.length, brands };
  },
});

/** Wipe Gymshark / Duolingo / Oatly scan cache so the next Fast scan runs live. */
export const clearTryBrandCaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const removed: { name: string; url: string }[] = [];
    for (const hostKey of DEMO_BRAND_HOSTS) {
      removed.push(...(await clearTryBrandByHostKey(ctx, hostKey)));
    }

    return {
      brandsRemoved: removed.length,
      brands: removed,
      hosts: [...DEMO_BRAND_HOSTS],
    };
  },
});
