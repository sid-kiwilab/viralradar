import {
  SHOWCASE_CACHE_MISSING_MESSAGE,
  SHOWCASE_DEMO_ONLY_MESSAGE,
} from "@/lib/showcaseMode";

/** Never show Convex / Apify ops copy in the UI. */
export function userFacingScanError(raw: string): string {
  const message = raw.trim();
  const lower = message.toLowerCase();

  if (
    message === SHOWCASE_DEMO_ONLY_MESSAGE ||
    message === SHOWCASE_CACHE_MISSING_MESSAGE
  ) {
    return message;
  }

  if (
    lower.includes("apify api key") ||
    lower.includes("apify_api_key") ||
    lower.includes("set apify") ||
    lower.includes("convex deployment") ||
    lower.includes("apify scrape failed")
  ) {
    return "TikTok lookup isn’t available here. Use Fast scan on Gymshark, Duolingo, or Oatly.";
  }

  if (lower.includes("apify has no credits")) {
    return "TikTok lookup is temporarily unavailable. Try Fast scan on a demo brand below.";
  }

  if (message.length > 320) {
    return `${message.slice(0, 317)}…`;
  }

  return message;
}