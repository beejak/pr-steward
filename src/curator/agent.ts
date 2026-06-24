import type { CuratorContext } from "./types.js";

export interface AgentCurateConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export async function polishReadmeWithDeepSeek(
  readme: string,
  context: CuratorContext,
  config: AgentCurateConfig,
): Promise<string | null> {
  const baseUrl = (config.baseUrl ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = config.model ?? "deepseek-chat";

  const systemPrompt = `You are a documentation curator for pr-steward (PR lifecycle automation).
Rewrite the README to be clear, accurate, and well-structured. Preserve all factual claims from the input and context JSON.
Do not invent features. Keep rollout mode, security tiers, and non-goals accurate.
Output ONLY the markdown file body — no code fences around the whole document.`;

  const userPrompt = `Context JSON:
${JSON.stringify(context, null, 2)}

Current README draft:
${readme}

Polish this README. Keep links to docs/architecture.md, docs/commands.md, docs/help.md, docs/what-we-dont-do.md, and existing phase3/agentwatch docs.`;

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    return content.replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
  } catch {
    return null;
  }
}
