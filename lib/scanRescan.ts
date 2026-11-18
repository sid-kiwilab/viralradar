/** User-facing copy when a scan step fails — no guessed data. */
export const SCAN_AGAIN_HINT = "Scan again when you're ready.";

export function scanStepFailed(what: string): string {
  return `We couldn't ${what}. ${SCAN_AGAIN_HINT}`;
}
