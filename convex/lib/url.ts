export function normalizeBrandUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Enter a brand URL");
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (!parsed.hostname) {
    throw new Error("Invalid URL");
  }
  parsed.hash = "";
  let path = parsed.pathname.replace(/\/+$/, "");
  if (path === "") {
    path = "/";
  }
  parsed.pathname = path;
  return parsed.toString();
}

export function hostnameLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const part = host.split(".")[0] ?? host;
    return part.charAt(0).toUpperCase() + part.slice(1);
  } catch {
    return "Brand";
  }
}
