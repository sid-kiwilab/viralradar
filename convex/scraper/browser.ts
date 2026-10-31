"use node";

import { chromium, type Browser, type Page } from "playwright-core";
import { brightDataCdp, waitForCaptcha } from "./brightDataCdp";
import { fetchPageViaFirecrawl, hasFirecrawl } from "./firecrawl";
import { looksUnreadable } from "./pageReadQuality";
import type { FetchPageResult, PageSnapshot } from "./pageSnapshot";

export type { FetchPageResult, PageSnapshot } from "./pageSnapshot";

const NAV_TIMEOUT_MS = 120_000;
const MAX_BODY_CHARS = 24_000;

function resolveBrowserEndpoint(): string {
  const wss = process.env.BRIGHTDATA_BROWSER_WSS?.trim();
  if (wss) {
    return wss;
  }
  const username = process.env.BRIGHTDATA_BROWSER_USERNAME?.trim();
  const password = process.env.BRIGHTDATA_BROWSER_PASSWORD?.trim();
  if (username && password) {
    return `wss://${encodeURIComponent(username)}:${encodeURIComponent(password)}@brd.superproxy.io:9222`;
  }
  throw new Error(
    "Set BRIGHTDATA_BROWSER_WSS or BRIGHTDATA_BROWSER_USERNAME and BRIGHTDATA_BROWSER_PASSWORD on the Convex deployment",
  );
}

async function enableUnblockers(page: Page): Promise<void> {
  const client = await brightDataCdp(page);
  try {
    await client.send("Unblocker.enableCookieBlock");
  } catch {
    // Older zones may not support CookieBlock; continue.
  }
}

async function tryDismissConsent(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("Agree")',
    'button:has-text("I agree")',
    'button:has-text("Allow all")',
    '[id*="accept" i]',
    '[class*="accept" i]',
  ];
  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 800 })) {
        await el.click({ timeout: 3000 });
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // try next selector
    }
  }
}

async function readSnapshot(page: Page): Promise<PageSnapshot> {
  const snapshot = await page.evaluate((maxChars) => {
    const meta =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? "";
    const body = document.body?.innerText ?? "";
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((el) => (el as HTMLAnchorElement).href)
      .filter((href) => href.startsWith("http"))
      .slice(0, 300);
    return {
      url: location.href,
      title: document.title ?? "",
      metaDescription: meta,
      bodyText: body.slice(0, maxChars),
      links,
    };
  }, MAX_BODY_CHARS);
  return snapshot;
}

async function fetchOnceViaBrightData(url: string): Promise<FetchPageResult> {
  const endpoint = resolveBrowserEndpoint();
  let browser: Browser | undefined;
  try {
    browser = await chromium.connectOverCDP(endpoint, { timeout: 60_000 });
    const page = await browser.newPage();
    await enableUnblockers(page);
    await page.goto(url, { timeout: NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
    await waitForCaptcha(page);
    await tryDismissConsent(page);
    await page.waitForTimeout(1500);
    const snapshot = await readSnapshot(page);
    const unreadable = looksUnreadable(snapshot);
    if (unreadable) {
      return { ok: false, reason: unreadable };
    }
    return { ok: true, snapshot };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: message };
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

async function fetchViaBrightDataWithRetry(url: string): Promise<FetchPageResult> {
  const first = await fetchOnceViaBrightData(url);
  if (first.ok) {
    return first;
  }
  const second = await fetchOnceViaBrightData(url);
  if (second.ok) {
    return second;
  }
  const reason = second.reason || first.reason || "Could not read the site";
  return { ok: false, reason };
}

/** Firecrawl first (one attempt), then Bright Data Browser API with one retry. */
export async function fetchPageContent(url: string): Promise<FetchPageResult> {
  let firecrawlNote: string | undefined;
  if (hasFirecrawl()) {
    const firecrawl = await fetchPageViaFirecrawl(url);
    if (firecrawl.ok) {
      const unreadable = looksUnreadable(firecrawl.snapshot);
      if (!unreadable) {
        return firecrawl;
      }
      firecrawlNote = unreadable;
    } else {
      firecrawlNote = firecrawl.reason;
    }
  }
  const brightData = await fetchViaBrightDataWithRetry(url);
  if (brightData.ok) {
    return brightData;
  }
  if (firecrawlNote) {
    return {
      ok: false,
      reason: `${brightData.reason} (Firecrawl: ${firecrawlNote})`,
    };
  }
  return brightData;
}

/** Run work in a fresh Browser API session (single domain per session). */
export async function withBrowserSession<T>(
  fn: (page: Page, browser: Browser) => Promise<T>,
): Promise<T> {
  const endpoint = resolveBrowserEndpoint();
  const browser = await chromium.connectOverCDP(endpoint, { timeout: 60_000 });
  try {
    const page = await browser.newPage();
    await enableUnblockers(page);
    return await fn(page, browser);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
