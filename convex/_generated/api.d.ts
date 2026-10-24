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
import type * as discovery_handleFromName from "../discovery/handleFromName.js";
import type * as handles from "../handles.js";
import type * as health from "../health.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as posts from "../posts.js";
import type * as scoring from "../scoring.js";
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
  "discovery/handleFromName": typeof discovery_handleFromName;
  handles: typeof handles;
  health: typeof health;
  "lib/openrouter": typeof lib_openrouter;
  posts: typeof posts;
  scoring: typeof scoring;
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
