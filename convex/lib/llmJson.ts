import type OpenAI from "openai";
import { DEFAULT_LLM_MODEL } from "./openrouter";

/** First complete `{...}` so trailing prose or a second object cannot break parse. */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** Strip markdown fences some models add despite json_object mode. */
export function parseModelJson<T>(raw: string): T {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) {
    text = fenced[1]!.trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }

  const candidates = [text];
  const first = extractFirstJsonObject(text);
  if (first && first !== text) {
    candidates.push(first);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }
  throw new Error("Model returned invalid JSON");
}

export async function chatJsonWithRaw<T>(
  client: OpenAI,
  system: string,
  user: string,
  model: string = DEFAULT_LLM_MODEL,
): Promise<{ parsed: T; raw: string; model: string }> {
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
  return { parsed: parseModelJson<T>(raw), raw, model };
}

export async function chatJson<T>(
  client: OpenAI,
  system: string,
  user: string,
  model: string = DEFAULT_LLM_MODEL,
): Promise<T> {
  const { parsed } = await chatJsonWithRaw<T>(client, system, user, model);
  return parsed;
}
