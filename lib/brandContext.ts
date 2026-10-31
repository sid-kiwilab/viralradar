/** Brand understanding passed from site read into competitor discovery. */

export type BrandContext = {
  name: string;
  niche: string;
  service: string;
  products: string[];
  audience: string;
  positioning?: string;
  notThis: string;
  pageText?: string;
};
