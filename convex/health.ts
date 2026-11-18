import { query } from "./_generated/server";
import { isShowcaseMode } from "./lib/showcaseMode";

export const get = query({
  args: {},
  handler: async () => {
    return { ok: true as const, showcaseMode: isShowcaseMode() };
  },
});
