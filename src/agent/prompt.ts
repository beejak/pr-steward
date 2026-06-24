import type { AgentTriageInput, AgentVerdict } from "./types.js";

const VERDICT_SCHEMA = `{
  "verdict": "close" | "warn" | "defer" | "skip",
  "confidence": number between 0 and 1,
  "comment": "one paragraph explanation"
}`;

export function buildTriagePrompt(input: AgentTriageInput, repo: string): string {
  const { pr, context } = input;
  const overlaps = context.mergedPullRequests
    .filter((m) => m.mergedAt > pr.createdAt)
    .map((m) => ({
      mergedPr: m.number,
      mergedAt: m.mergedAt.toISOString(),
      files: m.files,
    }));

  return `You are pr-steward agent triage. Classify whether open PR #${pr.number} is superseded.

Repository: ${repo}
PR title: ${pr.title}
PR author: ${pr.author} (bot=${pr.isBot})
PR created: ${pr.createdAt.toISOString()}
Changed files: ${JSON.stringify(pr.changedFiles ?? [])}
Recently merged PRs with timing: ${JSON.stringify(overlaps)}

Respond with ONLY valid JSON matching:
${VERDICT_SCHEMA}

Rules:
- verdict "close" only if changes are clearly redundant with merged work
- confidence >= 0.9 only with strong file-level evidence
- human-authored PRs should prefer "warn" over "close" unless overlap is total`;
}

export function parseAgentJson(
  text: string,
  prNumber: number,
  source: AgentVerdict["source"],
): AgentVerdict | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as {
      verdict?: string;
      confidence?: number;
      comment?: string;
    };
    const verdict = raw.verdict;
    if (!["close", "warn", "defer", "skip"].includes(verdict ?? "")) return null;
    return {
      prNumber,
      verdict: verdict as AgentVerdict["verdict"],
      confidence: Math.min(1, Math.max(0, raw.confidence ?? 0)),
      ruleId: "C6",
      comment: raw.comment ?? "Agent triage completed.",
      source,
    };
  } catch {
    return null;
  }
}
