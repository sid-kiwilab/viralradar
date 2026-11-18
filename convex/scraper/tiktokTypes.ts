export type TikTokAccountSource = "brand" | "niche";

export type TikTokFoundVia = "site" | "search";

export type ResolvedTikTokAccount = {
  name: string;
  handle: string;
  displayName?: string;
  verified?: boolean;
  fans?: number;
  source?: TikTokAccountSource;
  foundVia?: TikTokFoundVia;
};

export type ScrapedTikTokPost = {
  postId: string;
  url: string;
  thumbnail: string;
  caption: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  soundId?: string;
  postedAt: number;
};

export type TikTokHandleScrape = {
  handle: string;
  displayName?: string;
  posts: ScrapedTikTokPost[];
};

export type TikTokScrapeBatch = {
  handles: TikTokHandleScrape[];
  /** Set when latest or popular profile pass failed but the other returned posts. */
  passNotice?: string;
};
