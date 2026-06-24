import type { AgentTriageInput, AgentVerdict } from "./types.js";
import { filesOverlap } from "../engine/helpers.js";

function overlapRatio(pr: AgentTriageInput["pr"], mergedFiles: string[]): number {
  const changed = pr.changedFiles ?? [];
  if (changed.length === 0 || mergedFiles.length === 0) return 0;
  const mergedSet = new Set(mergedFiles);
  const hit = changed.filter((f) => mergedSet.has(f)).length;
  return hit / changed.length;
}

export function triageWithHeuristic(input: AgentTriageInput): AgentVerdict {
  const { pr, context } = input;
  const candidates = context.mergedPullRequests.filter(
    (m) => m.mergedAt > pr.createdAt && filesOverlap(pr.changedFiles ?? [], m.files),
  );

  if (candidates.length === 0) {
    return {
      prNumber: pr.number,
      verdict: "skip",
      confidence: 0.5,
      ruleId: "C6",
      comment: "No merged PR overlap found on re-check.",
      source: "heuristic",
    };
  }

  const best = candidates.reduce((a, b) => {
    const ratioA = overlapRatio(pr, a.files);
    const ratioB = overlapRatio(pr, b.files);
    return ratioB > ratioA ? b : a;
  });

  const ratio = overlapRatio(pr, best.files);

  if (ratio >= 1) {
    return {
      prNumber: pr.number,
      verdict: "close",
      confidence: 0.95,
      ruleId: "C6",
      comment: `Changes appear fully superseded by merged PR #${best.number} (${Math.round(ratio * 100)}% file overlap).`,
      source: "heuristic",
    };
  }

  if (ratio >= 0.5) {
    return {
      prNumber: pr.number,
      verdict: "warn",
      confidence: 0.75,
      ruleId: "C6",
      comment: `Partial overlap (${Math.round(ratio * 100)}%) with merged PR #${best.number} — maintainer review suggested.`,
      source: "heuristic",
    };
  }

  return {
    prNumber: pr.number,
    verdict: "defer",
    confidence: 0.4,
    ruleId: "C6",
    comment: `Low overlap (${Math.round(ratio * 100)}%) with merged PR #${best.number} — deferring.`,
    source: "heuristic",
  };
}
