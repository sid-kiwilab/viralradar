import OpenAI from "openai";

/** Default Claude model via OpenRouter (swap with one line when testing). */
export const DEFAULT_LLM_MODEL = "anthropic/claude-sonnet-4";

/**
 * OpenAI-compatible client pointed at OpenRouter.
 * Set `OPENROUTER_API_KEY` on the Convex deployment (`npx convex env set`).
 */
export function createOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set on the Convex deployment");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/sid-kiwilab/viralradar",
      "X-Title": "Viral Radar",
    },
  });
}
