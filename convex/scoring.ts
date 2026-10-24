/**
 * Outlier score: views normalized against the handle's rolling baseline.
 * Implemented in a later build step.
 */
export function computeOutlierScore(
  views: number,
  baselineViews: number,
): number | undefined {
  if (baselineViews <= 0) {
    return undefined;
  }
  return views / baselineViews;
}
