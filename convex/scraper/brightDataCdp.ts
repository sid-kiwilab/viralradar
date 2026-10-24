"use node";

import type { Page } from "playwright-core";

export const CAPTCHA_DETECT_MS = 30_000;

export type BrightDataCdp = {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
};

export async function brightDataCdp(page: Page): Promise<BrightDataCdp> {
  return (await page.context().newCDPSession(page)) as unknown as BrightDataCdp;
}

export async function waitForCaptcha(page: Page): Promise<void> {
  const client = await brightDataCdp(page);
  try {
    await client.send("Captcha.waitForSolve", {
      detectTimeout: CAPTCHA_DETECT_MS,
    });
  } catch {
    // optional CDP
  }
}
