/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_scanBrand from "../actions/scanBrand.js";
import type * as brands from "../brands.js";
import type * as breakdowns from "../breakdowns.js";
import type * as discovery_brandFromUrl from "../discovery/brandFromUrl.js";
import type * as discovery_competitorsFromBrand from "../discovery/competitorsFromBrand.js";
import type * as handles from "../handles.js";
import type * as health from "../health.js";
import type * as lib_llmJson from "../lib/llmJson.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_scraperErrors from "../lib/scraperErrors.js";
import type * as lib_url from "../lib/url.js";
import type * as posts from "../posts.js";
import type * as scanJobs from "../scanJobs.js";
import type * as scoring from "../scoring.js";
import type * as scraper_brightDataCdp from "../scraper/brightDataCdp.js";
import type * as scraper_browser from "../scraper/browser.js";
import type * as scraper_tiktok from "../scraper/tiktok.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/scanBrand": typeof actions_scanBrand;
  brands: typeof brands;
  breakdowns: typeof breakdowns;
  "discovery/brandFromUrl": typeof discovery_brandFromUrl;
  "discovery/competitorsFromBrand": typeof discovery_competitorsFromBrand;
  handles: typeof handles;
  health: typeof health;
  "lib/llmJson": typeof lib_llmJson;
  "lib/openrouter": typeof lib_openrouter;
  "lib/scraperErrors": typeof lib_scraperErrors;
  "lib/url": typeof lib_url;
  posts: typeof posts;
  scanJobs: typeof scanJobs;
  scoring: typeof scoring;
  "scraper/brightDataCdp": typeof scraper_brightDataCdp;
  "scraper/browser": typeof scraper_browser;
  "scraper/tiktok": typeof scraper_tiktok;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
