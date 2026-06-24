import { describe, expect, it } from "vitest";
import { mergeAgentVerdict, needsAgentTriage } from "../../src/agent/gate.js";
import { triageWithHeuristic } from "../../src/agent/heuristic.js";
import { buildEvaluationContext } from "../../src/engine/context.js";
import { evaluatePullRequest } from "../../src/engine/evaluate.js";
import { LifecycleRunner } from "../../src/runner/lifecycle.js";
import { MockPlatformClient } from "../../src/platform/client.js";
import { parsePolicy } from "../../src/policy/load.js";
import { humanPr } from "../helpers/fixtures.js";

describe("agent gate", () => {
  it("needsAgentTriage for C6 agent_review", () => {
    const d = evaluatePullRequest(
      humanPr({ changedFiles: ["a.ts"] }),
      parsePolicy({ version: 1 }),
      buildEvaluationContext(
        [humanPr({ number: 1, createdAt: new Date("2026-01-01"), changedFiles: ["a.ts"] })],
        [{ number: 9, mergedAt: new Date("2026-06-01"), files: ["a.ts"] }],
      ),
    );
    expect(d.action).toBe("agent_review");
    expect(needsAgentTriage(d)).toBe(true);
  });

  it("mergeAgentVerdict blocks close below confidence threshold", () => {
    const base = { action: "agent_review" as const, ruleId: "C6", reason: "triage", confidence: 0.6 };
    const merged = mergeAgentVerdict(base, {
      prNumber: 1,
      verdict: "close",
      confidence: 0.75,
      ruleId: "C6",
      comment: "Partial overlap",
      source: "heuristic",
    });
    expect(merged.action).toBe("warn");
  });

  it("mergeAgentVerdict allows close at high confidence", () => {
    const base = { action: "agent_review" as const, ruleId: "C6", reason: "triage", confidence: 0.6 };
    const merged = mergeAgentVerdict(base, {
      prNumber: 1,
      verdict: "close",
      confidence: 0.95,
      ruleId: "C6",
      comment: "Fully superseded",
      source: "heuristic",
    });
    expect(merged.action).toBe("close");
  });
});

describe("heuristic triage", () => {
  it("recommends close on 100% file overlap", () => {
    const pr = humanPr({
      number: 5,
      createdAt: new Date("2026-01-01"),
      changedFiles: ["src/x.ts"],
    });
    const context = buildEvaluationContext(
      [pr],
      [{ number: 99, mergedAt: new Date("2026-03-01"), files: ["src/x.ts", "src/y.ts"] }],
    );
    const verdict = triageWithHeuristic({ pr, context });
    expect(verdict.verdict).toBe("close");
    expect(verdict.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe("LifecycleRunner agent integration", () => {
  it("triages human overlap PR and warns in bot-only (no human close)", async () => {
    const pr = humanPr({
      number: 8,
      createdAt: new Date("2026-01-01"),
      changedFiles: ["lib/a.ts"],
    });
    const client = new MockPlatformClient(
      [pr],
      [{ number: 50, mergedAt: new Date("2026-04-01"), files: ["lib/a.ts"] }],
    );
    const policy = parsePolicy({ version: 1, rollout: { mode: "bot-only" } });
    const summary = await new LifecycleRunner(client, policy, {
      repository: "beejak/pr-steward",
    }).run();

    expect(summary.agentTriaged).toBe(1);
    const row = summary.results.find((r) => r.pr.number === 8);
    expect(row?.agentVerdict?.source).toBe("heuristic");
    expect(row?.decision.action).toBe("warn");
    expect(row?.applied).toBe(true);
    expect(client.calls.some((c) => c.method === "addComment")).toBe(true);
    expect(client.calls.some((c) => c.method === "closePullRequest")).toBe(false);
  });
});
