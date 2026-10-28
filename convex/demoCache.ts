import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { DEMO_BRAND_HOSTS, urlMatchesDemoHost } from "./lib/demoBrands";
import { purgeBrandScanData } from "./lib/purgeBrandScan";

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
    const brands = await clearBrandByHostKey(ctx, hostKey);
    return { host: hostKey, brandsRemoved: brands.length, brands };
  },
});

/** Wipe Gymshark / Duolingo / Oatly scan cache so the next Fast scan runs live. */
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
