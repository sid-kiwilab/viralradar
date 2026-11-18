import { isTikTokWaitDetail } from "@/lib/tiktok-wait";

export function stageLabel(
  stage: string,
  status: string,
  detail?: string | null,
): string {
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
