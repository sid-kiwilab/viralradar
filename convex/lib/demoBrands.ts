import { DEMO_BRAND_HOSTS as DEMO_BRAND_HOSTS_LIST } from "../../lib/demo-brands";

/** Demo hosts: reuse completed scans instead of live scrape when data exists. */
export const DEMO_BRAND_HOSTS = new Set<string>(DEMO_BRAND_HOSTS_LIST);

export function demoHostKeyFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return DEMO_BRAND_HOSTS.has(host) ? host : null;
  } catch {
    return null;
  }
}

export function urlMatchesDemoHost(brandUrl: string, hostKey: string): boolean {
  try {
    const host = new URL(brandUrl).hostname.replace(/^www\./i, "").toLowerCase();
    return host === hostKey;
  } catch {
    return false;
  }
}
