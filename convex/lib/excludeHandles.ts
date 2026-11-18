const MIN_HANDLE_LEN = 3;

function tokenToHandle(raw: string): string | null {
  let s = raw.trim();
  if (!s) {
    return null;
  }
  if (/instagram\.com/i.test(s)) {
    const match = s.match(/instagram\.com\/([^/?#]+)/i);
    const segment = match?.[1]?.toLowerCase();
    if (
      segment &&
      !["reel", "reels", "p", "stories"].includes(segment)
    ) {
      s = match![1]!;
    } else {
      return null;
    }
  }
  s = s.replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
  if (s.length < MIN_HANDLE_LEN) {
    return null;
  }
  return s;
}

/** Comma- or whitespace-separated handles from the Scan form. */
export function parseExcludeHandlesInput(input: string | undefined): string[] {
  if (!input?.trim()) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(/[,\s]+/)) {
    const handle = tokenToHandle(part);
    if (handle && !seen.has(handle)) {
      seen.add(handle);
      out.push(handle);
    }
  }
  return out;
}

export function isExcludedHandle(
  handle: string,
  excludeHandles: readonly string[],
): boolean {
  if (excludeHandles.length === 0) {
    return false;
  }
  const key =
    tokenToHandle(handle) ??
    handle.replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
  return key.length >= MIN_HANDLE_LEN && excludeHandles.includes(key);
}
