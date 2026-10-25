export function formatMultiplier(score: number): string {
  if (score >= 10) {
    return `${score.toFixed(1)}x`;
  }
  return `${score.toFixed(2)}x`;
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K`;
  }
  return String(views);
}
