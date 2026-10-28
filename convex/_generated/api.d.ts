/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_breakdownPost from "../actions/breakdownPost.js";
import type * as actions_scanBrand from "../actions/scanBrand.js";
import type * as actions_thumbnails from "../actions/thumbnails.js";
import type * as brands from "../brands.js";
import type * as breakdowns from "../breakdowns.js";
import type * as discovery_brandFromUrl from "../discovery/brandFromUrl.js";
import type * as discovery_breakdownFromPost from "../discovery/breakdownFromPost.js";
import type * as discovery_competitorSearchQueries from "../discovery/competitorSearchQueries.js";
import type * as discovery_competitorsFromBrand from "../discovery/competitorsFromBrand.js";
import type * as discovery_filterTikTokAccounts from "../discovery/filterTikTokAccounts.js";
import type * as discovery_nicheSearchQueries from "../discovery/nicheSearchQueries.js";
import type * as handles from "../handles.js";
import type * as health from "../health.js";
import type * as lib_demoBrands from "../lib/demoBrands.js";
import type * as lib_llmJson from "../lib/llmJson.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_postThumbnail from "../lib/postThumbnail.js";
import type * as lib_proposedAccount from "../lib/proposedAccount.js";
import type * as lib_scraperErrors from "../lib/scraperErrors.js";
import type * as lib_storeThumbnail from "../lib/storeThumbnail.js";
import type * as lib_tiktokUrls from "../lib/tiktokUrls.js";
import type * as lib_url from "../lib/url.js";
import type * as posts from "../posts.js";
import type * as scanJobs from "../scanJobs.js";
import type * as scoring from "../scoring.js";
import type * as scraper_apifyTikTok from "../scraper/apifyTikTok.js";
import type * as scraper_brightDataCdp from "../scraper/brightDataCdp.js";
import type * as scraper_brightDataSerp from "../scraper/brightDataSerp.js";
import type * as scraper_browser from "../scraper/browser.js";
import type * as scraper_tiktok from "../scraper/tiktok.js";
import type * as scraper_tiktokLinks from "../scraper/tiktokLinks.js";
import type * as scraper_tiktokTypes from "../scraper/tiktokTypes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/breakdownPost": typeof actions_breakdownPost;
  "actions/scanBrand": typeof actions_scanBrand;
  "actions/thumbnails": typeof actions_thumbnails;
  brands: typeof brands;
  breakdowns: typeof breakdowns;
  "discovery/brandFromUrl": typeof discovery_brandFromUrl;
  "discovery/breakdownFromPost": typeof discovery_breakdownFromPost;
  "discovery/competitorSearchQueries": typeof discovery_competitorSearchQueries;
  "discovery/competitorsFromBrand": typeof discovery_competitorsFromBrand;
  "discovery/filterTikTokAccounts": typeof discovery_filterTikTokAccounts;
  "discovery/nicheSearchQueries": typeof discovery_nicheSearchQueries;
  handles: typeof handles;
  health: typeof health;
  "lib/demoBrands": typeof lib_demoBrands;
  "lib/llmJson": typeof lib_llmJson;
  "lib/openrouter": typeof lib_openrouter;
  "lib/postThumbnail": typeof lib_postThumbnail;
  "lib/proposedAccount": typeof lib_proposedAccount;
  "lib/scraperErrors": typeof lib_scraperErrors;
  "lib/storeThumbnail": typeof lib_storeThumbnail;
  "lib/tiktokUrls": typeof lib_tiktokUrls;
  "lib/url": typeof lib_url;
  posts: typeof posts;
  scanJobs: typeof scanJobs;
  scoring: typeof scoring;
  "scraper/apifyTikTok": typeof scraper_apifyTikTok;
  "scraper/brightDataCdp": typeof scraper_brightDataCdp;
  "scraper/brightDataSerp": typeof scraper_brightDataSerp;
  "scraper/browser": typeof scraper_browser;
  "scraper/tiktok": typeof scraper_tiktok;
  "scraper/tiktokLinks": typeof scraper_tiktokLinks;
  "scraper/tiktokTypes": typeof scraper_tiktokTypes;
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
