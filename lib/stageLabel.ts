import { isTikTokWaitDetail } from "@/lib/tiktok-wait";

export function stageLabel(
  stage: string,
  status: string,
  detail?: string | null,
): string {
  if (status === "waiting" && stage === "review_brand") {
    if (detail?.trim() && !isTikTokWaitDetail(detail)) {
      return detail.trim();
    }
    return "Check what we understood. Re-read the site or find competitors.";
  }
  if (status === "waiting" && stage === "review_competitors") {
    if (detail?.trim() && !isTikTokWaitDetail(detail)) {
      return detail.trim();
    }
    return "Confirm competitor TikTok accounts to scrape.";
  }
  if (status === "failed") {
    return "Scan failed.";
  }
  if (detail?.trim() && !isTikTokWaitDetail(detail)) {
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
