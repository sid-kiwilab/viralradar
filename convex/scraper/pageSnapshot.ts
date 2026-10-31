export type PageSnapshot = {
  url: string;
  title: string;
  metaDescription: string;
  bodyText: string;
  links: string[];
};

export type FetchPageResult =
  | { ok: true; snapshot: PageSnapshot }
  | { ok: false; reason: string };
