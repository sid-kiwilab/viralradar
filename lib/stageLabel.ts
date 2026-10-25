export function stageLabel(
  stage: string,
  status: string,
  detail?: string | null,
): string {
  if (status === "waiting" && stage === "review_competitors") {
    return "Confirm official accounts and niche creators to scrape.";
  }
  if (status === "failed") {
    return "Scan failed.";
  }
  if (detail?.trim()) {
    return detail;
  }
  switch (stage) {
    case "queued":
      return "Starting scan…";
    case "understand_site":
      return "Reading the brand site…";
    case "find_competitors":
      return "Finding competitors…";
    case "search_tiktok":
      return "Searching TikTok…";
    case "score":
      return "Scoring outlier posts…";
    case "done":
      return "Scan complete.";
    case "failed":
      return "Scan failed.";
    default:
      return "Working…";
  }
}
