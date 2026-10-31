import type { PageSnapshot } from "./pageSnapshot";

export function looksUnreadable(snapshot: PageSnapshot): string | null {
  const combined = `${snapshot.title}\n${snapshot.bodyText}`.toLowerCase();
  const challengeHints = [
    "just a moment",
    "access denied",
    "attention required",
    "verify you are human",
    "cf-browser-verification",
    "enable javascript",
    "403 forbidden",
    "request blocked",
  ];
  for (const hint of challengeHints) {
    if (combined.includes(hint)) {
      return `Page looks like a challenge or block screen (${hint})`;
    }
  }
  const meaningful = snapshot.bodyText.replace(/\s+/g, " ").trim();
  if (meaningful.length < 120) {
    return "Page body is too short to infer the brand";
  }
  return null;
}
