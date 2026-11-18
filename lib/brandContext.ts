/** Brand understanding passed from site read into niche search inference. */

export type BrandContext = {
  name: string;
  niche: string;
  /** Short shoppable category phrase (2–6 words) for Instagram search inference. */
  searchCategory?: string;
  service: string;
  products: string[];
  audience: string;
  positioning?: string;
  notThis: string;
};
