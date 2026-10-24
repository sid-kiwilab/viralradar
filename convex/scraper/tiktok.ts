/**
 * TikTok scrape via Playwright connected to Bright Data Browser API
 * (`BRIGHTDATA_BROWSER_WSS`, connectOverCDP). Not implemented yet.
 */
export type ScrapeTikTokHandleResult = {
  status: "not_implemented";
  handle: string;
};

export async function scrapeTikTokHandle(
  handle: string,
): Promise<ScrapeTikTokHandleResult> {
  return { status: "not_implemented", handle };
}
