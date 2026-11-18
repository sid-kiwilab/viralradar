import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DEMO_BRAND_HOSTS as DEMO_HOST_LIST, TRY_TIKTOK_HANDLE_BY_HOST } from "../lib/demo-brands";
import { DEMO_BRAND_HOSTS, urlMatchesDemoHost } from "./lib/demoBrands";
import { purgeBrandScanData } from "./lib/purgeBrandScan";
import { hostnameLabel, normalizeBrandUrl } from "./lib/url";

function bareHostFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const bare = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    ?.toLowerCase();
  if (bare) {
    return bare;
  }
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

function normalizeTryHost(raw: string): string | null {
  const hostKey = bareHostFromInput(raw);
  if (!hostKey || !DEMO_BRAND_HOSTS.has(hostKey)) {
    return null;
  }
  return hostKey;
}

async function clearBrandByHostKey(
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

function isTryBrandUrl(brandUrl: string): boolean {
  for (const hostKey of DEMO_BRAND_HOSTS) {
    if (urlMatchesDemoHost(brandUrl, hostKey)) {
      return true;
    }
  }
  return false;
}

/** Wipe one non-Try host on dev (CLI only). Use Try-specific clears for demo chips. */
export const clearBrandCacheByHost = internalMutation({
  args: { host: v.string() },
  handler: async (ctx, args) => {
    const hostKey = bareHostFromInput(args.host);
    if (!hostKey) {
      throw new Error("host must be a domain, e.g. usefastlane.ai");
    }
    if (DEMO_BRAND_HOSTS.has(hostKey)) {
      throw new Error(
        "Refusing to clear a Try brand here. Use clearTryBrandCacheByHost for gymshark.com, duolingo.com, or oatly.com",
      );
    }
    const brands = await clearBrandByHostKey(ctx, hostKey);
    return { host: hostKey, brandsRemoved: brands.length, brands };
  },
});

/** Wipe every brand except Gymshark / Duolingo / Oatly (dev CLI only). */
export const clearNonTryBrandCaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const removed: { name: string; url: string }[] = [];
    for (const brand of await ctx.db.query("brands").collect()) {
      if (isTryBrandUrl(brand.url)) {
        continue;
      }
      await purgeBrandScanData(ctx, brand._id);
      await ctx.db.delete(brand._id);
      removed.push({ name: brand.name, url: brand.url });
    }
    return {
      brandsRemoved: removed.length,
      brands: removed,
      preservedTryHosts: [...DEMO_BRAND_HOSTS],
    };
  },
});

/** Wipe one Try host on dev (CLI only). */
export const clearTryBrandCacheByHost = internalMutation({
  args: { host: v.string() },
  handler: async (ctx, args) => {
    const hostKey = normalizeTryHost(args.host);
    if (!hostKey) {
      throw new Error(
        "host must be a demo brand host (see lib/demo-brands.ts)",
      );
    }
    const brands = await clearBrandByHostKey(ctx, hostKey);
    return { host: hostKey, brandsRemoved: brands.length, brands };
  },
});

async function scheduleTryTikTokSeed(
  ctx: MutationCtx,
  hostKey: string,
): Promise<{ host: string; brandId: Id<"brands">; jobId: Id<"scanJobs">; handle: string }> {
  const handle =
    TRY_TIKTOK_HANDLE_BY_HOST[
      hostKey as keyof typeof TRY_TIKTOK_HANDLE_BY_HOST
    ];
  if (!handle) {
    throw new Error(`No TikTok handle mapped for Try host ${hostKey}`);
  }

  const url = normalizeBrandUrl(`https://${hostKey}`);
  const existing = (await ctx.db.query("brands").collect()).find((brand) =>
    urlMatchesDemoHost(brand.url, hostKey),
  );

  const brandId =
    existing?._id ??
    (await ctx.db.insert("brands", {
      url,
      name: hostnameLabel(url),
      niche: "Unknown",
      createdAt: Date.now(),
    }));

  await purgeBrandScanData(ctx, brandId);

  const jobId = await ctx.db.insert("scanJobs", {
    brandId,
    status: "pending",
    stage: "queued",
    startedAt: Date.now(),
  });

  await ctx.scheduler.runAfter(0, internal.actions.scanBrand.seedTryTikTok, {
    brandId,
    jobId,
    handle,
  });

  return { host: hostKey, brandId, jobId, handle };
}

/** Scrape official TikTok for one Try host (dev CLI). Rebuilds Fast-scan cache. */
export const seedTryTikTokCacheByHost = internalMutation({
  args: { host: v.string() },
  handler: async (ctx, args) => {
    const hostKey = normalizeTryHost(args.host);
    if (!hostKey) {
      throw new Error(
        "host must be a TikTok-seeded Try brand (gymshark.com, duolingo.com, or oatly.com)",
      );
    }
    return await scheduleTryTikTokSeed(ctx, hostKey);
  },
});

/** Scrape official TikTok for all Try brands (dev CLI). */
export const seedTryTikTokCaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const scheduled = [];
    for (const hostKey of DEMO_HOST_LIST) {
      scheduled.push(await scheduleTryTikTokSeed(ctx, hostKey));
    }
    return { scheduled };
  },
});

/** Wipe demo host scan cache (dev CLI). Re-seed TikTok via seedTryTikTokCaches. */
export const clearTryBrandCaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const removed: { name: string; url: string }[] = [];
    for (const hostKey of DEMO_BRAND_HOSTS) {
      removed.push(...(await clearBrandByHostKey(ctx, hostKey)));
    }

    return {
      brandsRemoved: removed.length,
      brands: removed,
      hosts: [...DEMO_BRAND_HOSTS],
    };
  },
});
