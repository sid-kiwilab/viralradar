/** Short user-facing message for Bright Data / Playwright failures. */
export function formatScraperError(raw: string): string {
  const message = raw.trim();
  const lower = message.toLowerCase();

  if (
    lower.includes("compliance policy") ||
    lower.includes("proxy_error") ||
    lower.includes("special permission") ||
    lower.includes("brightdata.com/cp/kyc") ||
    (lower.includes("forbidden") &&
      (lower.includes("tiktok") || lower.includes("page.navigate")))
  ) {
    return (
      "TikTok is blocked on this Bright Data Browser zone until KYC is approved. " +
      "Complete the form at https://brightdata.com/cp/kyc or contact your account manager."
    );
  }

  if (message.length > 280) {
    return `${message.slice(0, 277)}…`;
  }
  return message;
}
