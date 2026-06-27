import type { PolicyConfig } from "../types.js";
import type { LifecycleResult } from "./lifecycle.js";

export interface RuleStatCounts {
  matched: number;
  applied: number;
  skipped: number;
  agentTriaged: number;
}

export type RuleStats = Record<string, RuleStatCounts>;

export interface RunMetadata {
  repository: string;
  mode: PolicyConfig["rollout"]["mode"];
  triageProvider: string;
  timestamp: string;
}

function emptyStat(): RuleStatCounts {
  return { matched: 0, applied: 0, skipped: 0, agentTriaged: 0 };
}

function bump(stats: RuleStats, ruleId: string): RuleStatCounts {
  if (!stats[ruleId]) stats[ruleId] = emptyStat();
  return stats[ruleId];
}

export function aggregateRuleStats(results: LifecycleResult[]): RuleStats {
  const stats: RuleStats = {};

  for (const r of results) {
    const ruleId = r.decision.ruleId;
    bump(stats, ruleId).matched += 1;

    if (r.agentVerdict) {
      bump(stats, ruleId).agentTriaged += 1;
    }

    if (r.applied) {
      bump(stats, ruleId).applied += 1;
    } else if (
      r.skippedReason &&
      (r.decision.action === "close" || r.decision.action === "warn")
    ) {
      bump(stats, ruleId).skipped += 1;
    }
  }

  return stats;
}

export function buildRunMetadata(input: RunMetadata): RunMetadata {
  return { ...input };
}

export function formatRuleStatsMarkdown(ruleStats: RuleStats): string {
  const rows = Object.entries(ruleStats).sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0) {
    return "No rule matches in this run.";
  }

  const lines = [
    "| Rule | Matched | Applied | Skipped | Agent triaged |",
    "|------|---------|---------|---------|---------------|",
  ];

  for (const [ruleId, counts] of rows) {
    lines.push(
      `| ${ruleId} | ${counts.matched} | ${counts.applied} | ${counts.skipped} | ${counts.agentTriaged} |`,
    );
  }

  return lines.join("\n");
}
