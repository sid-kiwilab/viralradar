/** Turn inferred niche into a short shoppable category phrase (no LLM). */
export function simplifyCategoryForGoogle(raw: string): string {
  let s = raw.trim();
  if (!s) {
    return s;
  }

  const paren = s.match(/\(([^)]+)\)/);
  if (paren) {
    let inner = paren[1]!.trim();
    inner = inner.replace(/\s+alternative\s*$/i, "").trim();
    const wordCount = inner.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 1 && wordCount <= 8 && inner.length <= 48) {
      s = inner;
    } else {
      s = s.replace(/\([^)]*\)/g, "").trim();
    }
  } else {
    s = s.replace(/\([^)]*\)/g, "").trim();
  }

  if (s.includes("/")) {
    const parts = s
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
    const multiWord = parts.filter((p) => p.split(/\s+/).length >= 2);
    if (multiWord.length > 0) {
      s = multiWord.sort((a, b) => a.length - b.length)[0]!;
    } else {
      s = parts.join(" ");
    }
  }

  s = s.replace(/\s+/g, " ").trim();
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    s = words.slice(0, 6).join(" ");
  }
  return s;
}
