const IGNORED_HANDLES = new Set([
  "tiktok",
  "explore",
  "foryou",
  "following",
  "discover",
  "live",
  "shop",
  "search",
]);

/** TikTok profile handles linked from a page. No name search. */
export function tiktokHandlesFromLinks(links: string[]): string[] {
  const seen = new Set<string>();
  const handles: string[] = [];
  for (const link of links) {
    const match = link.match(/tiktok\.com\/@([^/?#]+)/i);
    if (!match) continue;
    const handle = decodeURIComponent(match[1]!).replace(/^@/, "").trim();
    const key = handle.toLowerCase();
    if (!handle || IGNORED_HANDLES.has(key) || seen.has(key)) continue;
    seen.add(key);
    handles.push(handle);
  }
  return handles;
}
