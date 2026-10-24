import type OpenAI from "openai";
import { DEFAULT_LLM_MODEL } from "./openrouter";

/** Strip markdown fences some models add despite json_object mode. */
export function parseModelJson<T>(raw: string): T {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) {
    text = fenced[1]!.trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("Model returned invalid JSON");
  }
}

export async function chatJson<T>(
  client: OpenAI,
  system: string,
  user: string,
  model: string = DEFAULT_LLM_MODEL,
): Promise<T> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `${system}\n\nRespond with a single JSON object only. No markdown fences or prose.`,
      },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("Model returned empty content");
  }
  return parseModelJson<T>(raw);
}
