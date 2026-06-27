import { describe, expect, it } from "vitest";
import {
  aggregateRuleStats,
  buildRunMetadata,
  formatRuleStatsMarkdown,
} from "../../src/runner/metrics.js";
import type { LifecycleResult } from "../../src/runner/lifecycle.js";
import { botPr, humanPr } from "../helpers/fixtures.js";

function result(
  overrides: Partial<LifecycleResult> & Pick<LifecycleResult, "decision">,
): LifecycleResult {
  return {
    pr: humanPr({ number: 1 }),
    applied: false,
    ...overrides,
  };
}

describe("aggregateRuleStats", () => {
  it("counts matched, applied, skipped, and agentTriaged per ruleId", () => {
    const results: LifecycleResult[] = [
      result({
        pr: botPr({ number: 1 }),
        decision: { action: "close", ruleId: "B3", reason: "CI fail", confidence: 0.95 },
        applied: true,
      }),
      result({
        pr: humanPr({ number: 2 }),
        decision: { action: "warn", ruleId: "A3", reason: "Stale", confidence: 0.9 },
        applied: true,
      }),
      result({
        pr: humanPr({ number: 3 }),
        decision: { action: "warn", ruleId: "A3", reason: "Stale", confidence: 0.9 },
        applied: false,
        skippedReason: "dry-run mode",
      }),
      result({
        pr: humanPr({ number: 4 }),
        decision: {
          action: "warn",
          ruleId: "C6",
          reason: "Agent triage",
          confidence: 0.95,
        },
        applied: true,
        agentVerdict: {
          ruleId: "C6",
          action: "warn",
          confidence: 0.92,
          reason: "Partial overlap",
          provider: "deepseek",
        },
      }),
      result({
        decision: { action: "skip", ruleId: "none", reason: "No rule", confidence: 1 },
      }),
    ];

    const stats = aggregateRuleStats(results);

    expect(stats.B3).toEqual({ matched: 1, applied: 1, skipped: 0, agentTriaged: 0 });
    expect(stats.A3).toEqual({ matched: 2, applied: 1, skipped: 1, agentTriaged: 0 });
    expect(stats.C6).toEqual({ matched: 1, applied: 1, skipped: 0, agentTriaged: 1 });
    expect(stats.none).toEqual({ matched: 1, applied: 0, skipped: 0, agentTriaged: 0 });
  });
});

describe("buildRunMetadata", () => {
  it("includes repository, mode, triageProvider, and ISO timestamp", () => {
    const meta = buildRunMetadata({
      repository: "beejak/pr-steward",
      mode: "bot-only",
      triageProvider: "deepseek",
      timestamp: "2026-06-27T12:00:00.000Z",
    });

    expect(meta).toEqual({
      repository: "beejak/pr-steward",
      mode: "bot-only",
      triageProvider: "deepseek",
      timestamp: "2026-06-27T12:00:00.000Z",
    });
  });
});

describe("formatRuleStatsMarkdown", () => {
  it("renders a markdown table sorted by ruleId", () => {
    const md = formatRuleStatsMarkdown({
      B3: { matched: 2, applied: 1, skipped: 1, agentTriaged: 0 },
      A3: { matched: 1, applied: 1, skipped: 0, agentTriaged: 0 },
    });

    expect(md).toContain("| Rule | Matched | Applied | Skipped | Agent triaged |");
    expect(md).toContain("| A3 | 1 | 1 | 0 | 0 |");
    expect(md).toContain("| B3 | 2 | 1 | 1 | 0 |");
  });
});
