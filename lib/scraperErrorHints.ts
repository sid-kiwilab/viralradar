/** True when an error message (already formatted or raw) refers to Bright Data TikTok KYC. */
export function isBrightDataTikTokBlockMessage(message: string): boolean {
  const lower = message.trim().toLowerCase();
  if (lower.includes("tiktok is blocked on this bright data")) {
    return true;
  }
  return (
    lower.includes("compliance policy") ||
    lower.includes("proxy_error") ||
    lower.includes("special permission") ||
    lower.includes("brightdata.com/cp/kyc") ||
    (lower.includes("forbidden") &&
      (lower.includes("tiktok") || lower.includes("page.navigate")))
  );
}
