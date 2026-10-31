/** Display ms durations from brand-understand step. */
export function formatStepMs(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return "—";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatUnderstandTimings(args: {
  pageReadMs?: number;
  inferMs?: number;
  understandMs?: number;
}): string {
  const parts = [
    `Site ${formatStepMs(args.pageReadMs)}`,
    `Infer ${formatStepMs(args.inferMs)}`,
    `Total ${formatStepMs(args.understandMs)}`,
  ];
  return parts.join(" · ");
}

export function formatDiscoverTimings(args: {
  queryMs?: number;
  serpMs?: number;
  extractMs?: number;
  discoverMs?: number;
}): string {
  const parts = [
    `Query ${formatStepMs(args.queryMs)}`,
    `Google ${formatStepMs(args.serpMs)}`,
    `Extract ${formatStepMs(args.extractMs)}`,
    `Total ${formatStepMs(args.discoverMs)}`,
  ];
  return parts.join(" · ");
}
