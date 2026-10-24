/**
 * Outlier score: views normalized against the handle's median baseline (min 5 posts).
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

export function computeBaselineViews(postViews: number[]): number | undefined {
  if (postViews.length < MIN_POSTS_FOR_BASELINE) {
    return undefined;
  }
  return median(postViews);
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
