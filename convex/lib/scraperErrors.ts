import { APIFY_TIKTOK_TIMEOUT_USER_MESSAGE } from "./apifyMessages";

/** Short user-facing message for Bright Data / Playwright / Apify failures. */
export function formatScraperError(raw: string): string {
  const message = raw.trim();
  const lower = message.toLowerCase();

  if (
    message === APIFY_TIKTOK_TIMEOUT_USER_MESSAGE ||
    lower.includes("tiktok lookup timed out")
  ) {
    return APIFY_TIKTOK_TIMEOUT_USER_MESSAGE;
  }

  if (
    lower.includes("apify api key was rejected") ||
    lower.includes("apify has no credits") ||
    lower.includes("tiktok scrape failed on apify")
  ) {
    return message.length > 280 ? `${message.slice(0, 277)}…` : message;
  }

  if (
    lower.includes("apify tiktok scrape failed") ||
    lower.includes("run-failed") ||
    lower.includes("timed-out")
  ) {
    return APIFY_TIKTOK_TIMEOUT_USER_MESSAGE;
  }

  if (lower.includes("firecrawl:")) {
    return "Could not read the brand site. Try again in a moment.";
  }

  if (
    lower.includes("compliance policy") ||
    lower.includes("proxy_error") ||
    lower.includes("special permission") ||
    lower.includes("brightdata.com/cp/kyc") ||
    (lower.includes("forbidden") &&
      (lower.includes("tiktok") || lower.includes("page.navigate")))
  ) {
    return (
      "TikTok is blocked on this Bright Data Browser zone until KYC is approved. " +
      "Complete the form at https://brightdata.com/cp/kyc or contact your account manager."
    );
  }

  if (message.length > 280) {
    return `${message.slice(0, 277)}…`;
  }
  return message;
}
