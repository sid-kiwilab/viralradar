export type ScrapedInstagramPost = {
  postId: string;
  url: string;
  thumbnail: string;
  caption: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  postedAt: number;
};

export type InstagramHandleScrape = {
  handle: string;
  displayName?: string;
  posts: ScrapedInstagramPost[];
};
