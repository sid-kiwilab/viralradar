/**
 * Outlier score: views vs median of the handle's most recent scraped posts (min 5).
 */

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export const MIN_POSTS_FOR_BASELINE = 5;
/** Latest-N window used as current-performance baseline (matches latest scrape size). */
export const BASELINE_RECENT_COUNT = 24;

export function computeBaselineViews(
  posts: { postedAt: number; views: number }[],
): number | undefined {
  const views = [...posts]
    .sort((a, b) => b.postedAt - a.postedAt)
    .slice(0, BASELINE_RECENT_COUNT)
    .map((post) => post.views)
    .filter((value) => value > 0);
  if (views.length < MIN_POSTS_FOR_BASELINE) {
    return undefined;
  }
  return median(views);
}

export function computeOutlierScore(
  views: number,
  baselineViews: number,
): number | undefined {
  if (baselineViews <= 0) {
    return undefined;
  }
  return views / baselineViews;
}
