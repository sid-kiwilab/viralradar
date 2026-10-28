import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

const MAX_BYTES = 2_000_000;

/** Fetch TikTok cover server-side and store in Convex file storage. */
export async function storeThumbnailFromUrl(
  ctx: ActionCtx,
  thumbnailUrl: string,
): Promise<Id<"_storage"> | undefined> {
  const url = thumbnailUrl.trim();
  if (!url) {
    return undefined;
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      return undefined;
    }
    const blob = await res.blob();
    if (blob.size < 64 || blob.size > MAX_BYTES) {
      return undefined;
    }
    return await ctx.storage.store(blob);
  } catch {
    return undefined;
  }
}
