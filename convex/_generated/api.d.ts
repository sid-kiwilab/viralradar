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
import type * as brandInferences from "../brandInferences.js";
import type * as brands from "../brands.js";
import type * as breakdowns from "../breakdowns.js";
import type * as demoCache from "../demoCache.js";
import type * as discovery_brandFromUrl from "../discovery/brandFromUrl.js";
import type * as discovery_breakdownFromPost from "../discovery/breakdownFromPost.js";
import type * as discovery_nicheSearchQueries from "../discovery/nicheSearchQueries.js";
import type * as handles from "../handles.js";
import type * as health from "../health.js";
import type * as lib_activeScanJob from "../lib/activeScanJob.js";
import type * as lib_apifyMessages from "../lib/apifyMessages.js";
import type * as lib_coerceModelLists from "../lib/coerceModelLists.js";
import type * as lib_demoBrands from "../lib/demoBrands.js";
import type * as lib_excludeHandles from "../lib/excludeHandles.js";
import type * as lib_instagramUrls from "../lib/instagramUrls.js";
import type * as lib_llmJson from "../lib/llmJson.js";
import type * as lib_nicheRelevance from "../lib/nicheRelevance.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_postThumbnail from "../lib/postThumbnail.js";
import type * as lib_proposedAccount from "../lib/proposedAccount.js";
import type * as lib_purgeBrandScan from "../lib/purgeBrandScan.js";
import type * as lib_scraperErrors from "../lib/scraperErrors.js";
import type * as lib_showcaseMode from "../lib/showcaseMode.js";
import type * as lib_storeThumbnail from "../lib/storeThumbnail.js";
import type * as lib_tiktokUrls from "../lib/tiktokUrls.js";
import type * as lib_url from "../lib/url.js";
import type * as nicheSearches from "../nicheSearches.js";
import type * as posts from "../posts.js";
import type * as scanJobs from "../scanJobs.js";
import type * as scoring from "../scoring.js";
import type * as scraper_apifyInstagram from "../scraper/apifyInstagram.js";
import type * as scraper_apifyInstagramProfile from "../scraper/apifyInstagramProfile.js";
import type * as scraper_apifyInstagramShared from "../scraper/apifyInstagramShared.js";
import type * as scraper_apifyTikTok from "../scraper/apifyTikTok.js";
import type * as scraper_brightDataCdp from "../scraper/brightDataCdp.js";
import type * as scraper_browser from "../scraper/browser.js";
import type * as scraper_firecrawl from "../scraper/firecrawl.js";
import type * as scraper_instagramTypes from "../scraper/instagramTypes.js";
import type * as scraper_pageReadQuality from "../scraper/pageReadQuality.js";
import type * as scraper_pageSnapshot from "../scraper/pageSnapshot.js";
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
  brandInferences: typeof brandInferences;
  brands: typeof brands;
  breakdowns: typeof breakdowns;
  demoCache: typeof demoCache;
  "discovery/brandFromUrl": typeof discovery_brandFromUrl;
  "discovery/breakdownFromPost": typeof discovery_breakdownFromPost;
  "discovery/nicheSearchQueries": typeof discovery_nicheSearchQueries;
  handles: typeof handles;
  health: typeof health;
  "lib/activeScanJob": typeof lib_activeScanJob;
  "lib/apifyMessages": typeof lib_apifyMessages;
  "lib/coerceModelLists": typeof lib_coerceModelLists;
  "lib/demoBrands": typeof lib_demoBrands;
  "lib/excludeHandles": typeof lib_excludeHandles;
  "lib/instagramUrls": typeof lib_instagramUrls;
  "lib/llmJson": typeof lib_llmJson;
  "lib/nicheRelevance": typeof lib_nicheRelevance;
  "lib/openrouter": typeof lib_openrouter;
  "lib/postThumbnail": typeof lib_postThumbnail;
  "lib/proposedAccount": typeof lib_proposedAccount;
  "lib/purgeBrandScan": typeof lib_purgeBrandScan;
  "lib/scraperErrors": typeof lib_scraperErrors;
  "lib/showcaseMode": typeof lib_showcaseMode;
  "lib/storeThumbnail": typeof lib_storeThumbnail;
  "lib/tiktokUrls": typeof lib_tiktokUrls;
  "lib/url": typeof lib_url;
  nicheSearches: typeof nicheSearches;
  posts: typeof posts;
  scanJobs: typeof scanJobs;
  scoring: typeof scoring;
  "scraper/apifyInstagram": typeof scraper_apifyInstagram;
  "scraper/apifyInstagramProfile": typeof scraper_apifyInstagramProfile;
  "scraper/apifyInstagramShared": typeof scraper_apifyInstagramShared;
  "scraper/apifyTikTok": typeof scraper_apifyTikTok;
  "scraper/brightDataCdp": typeof scraper_brightDataCdp;
  "scraper/browser": typeof scraper_browser;
  "scraper/firecrawl": typeof scraper_firecrawl;
  "scraper/instagramTypes": typeof scraper_instagramTypes;
  "scraper/pageReadQuality": typeof scraper_pageReadQuality;
  "scraper/pageSnapshot": typeof scraper_pageSnapshot;
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
