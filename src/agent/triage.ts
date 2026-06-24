import type { AgentTriageInput, AgentVerdict } from "./types.js";
import { triageWithHeuristic } from "./heuristic.js";
import { parseAgentJson, buildTriagePrompt } from "./prompt.js";
import { triageWithDeepSeek } from "./deepseek.js";

export type TriageProvider = "auto" | "deepseek" | "cursor" | "heuristic";

export interface TriageOptions {
  repo?: string;
  cursorApiKey?: string;
  deepseekApiKey?: string;
  provider?: TriageProvider;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
}

export async function triageWithCursor(
  input: AgentTriageInput,
  apiKey: string,
  repo: string,
): Promise<AgentVerdict | null> {
  try {
    const { Agent } = await import("@cursor/sdk");
    const result = await Agent.prompt(buildTriagePrompt(input, repo), {
      apiKey,
      model: { id: "composer-2.5" },
      cloud: { repos: [`https://github.com/${repo}`] },
    });
    if (result.status !== "completed" || !result.result) return null;
    return parseAgentJson(result.result, input.pr.number, "cursor");
  } catch {
    return null;
  }
}

export async function triagePullRequest(
  input: AgentTriageInput,
  options: TriageOptions = {},
): Promise<AgentVerdict> {
  const repo = options.repo ?? "beejak/pr-steward";
  const provider = options.provider ?? "auto";

  if (provider === "heuristic") {
    return triageWithHeuristic(input);
  }

  if (provider === "deepseek" || (provider === "auto" && options.deepseekApiKey)) {
    if (options.deepseekApiKey) {
      const deepseekVerdict = await triageWithDeepSeek(input, {
        apiKey: options.deepseekApiKey,
        repo,
        baseUrl: options.deepseekBaseUrl,
        model: options.deepseekModel,
      });
      if (deepseekVerdict) return deepseekVerdict;
    }
    if (provider === "deepseek") return triageWithHeuristic(input);
  }

  if (provider === "cursor" || (provider === "auto" && options.cursorApiKey)) {
    if (options.cursorApiKey) {
      const cursorVerdict = await triageWithCursor(input, options.cursorApiKey, repo);
      if (cursorVerdict) return cursorVerdict;
    }
    if (provider === "cursor") return triageWithHeuristic(input);
  }

  return triageWithHeuristic(input);
}
