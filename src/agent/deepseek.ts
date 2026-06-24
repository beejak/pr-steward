import type { AgentTriageInput, AgentVerdict } from "./types.js";
import { buildTriagePrompt, parseAgentJson } from "./prompt.js";

export interface DeepSeekTriageConfig {
  apiKey: string;
  repo: string;
  baseUrl?: string;
  model?: string;
}

export async function triageWithDeepSeek(
  input: AgentTriageInput,
  config: DeepSeekTriageConfig,
): Promise<AgentVerdict | null> {
  const baseUrl = (config.baseUrl ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = config.model ?? "deepseek-chat";

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildTriagePrompt(input, config.repo) }],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;

    return parseAgentJson(content, input.pr.number, "deepseek");
  } catch {
    return null;
  }
}
