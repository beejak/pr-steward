import { describe, expect, it } from "vitest";
import {
  filesOverlap,
  isSupersededByMergedWork,
  parseClosingIssues,
  parseDependabotPackage,
} from "../../src/engine/helpers.js";
import {
  buildEvaluationContext,
  findDuplicatePrNumbers,
  findDependabotSupersededNumbers,
} from "../../src/engine/context.js";
import { evaluatePullRequest, shouldApplyAction } from "../../src/engine/evaluate.js";
import { defaultPolicy } from "../../src/policy/load.js";
import { botPr, humanPr } from "../helpers/fixtures.js";

describe("helpers", () => {
  it("parseClosingIssues finds Closes #N", () => {
    expect(parseClosingIssues("Fix auth\n\nCloses #42")).toEqual([42]);
  });

  it("parseDependabotPackage extracts package name", () => {
    expect(parseDependabotPackage("Bump lodash from 4.17.20 to 4.17.21")).toBe("lodash");
  });

  it("isSupersededByMergedWork detects file overlap after PR created", () => {
    const pr = {
      createdAt: new Date("2026-01-01"),
      changedFiles: ["src/a.ts"],
    };
    const merged = [
      { mergedAt: new Date("2026-02-01"), files: ["src/a.ts", "src/b.ts"] },
    ];
    expect(isSupersededByMergedWork(pr, merged)).toBe(true);
    expect(filesOverlap(["src/a.ts"], ["src/c.ts"])).toBe(false);
  });
});

describe("context builders", () => {
  it("findDuplicatePrNumbers keeps oldest PR per issue", () => {
    const older = humanPr({
      number: 1,
      createdAt: new Date("2026-01-01"),
      closingIssueNumbers: [99],
    });
    const newer = humanPr({
      number: 2,
      createdAt: new Date("2026-02-01"),
      closingIssueNumbers: [99],
    });
    expect(findDuplicatePrNumbers([older, newer])).toEqual(new Set([2]));
  });

  it("findDependabotSupersededNumbers marks older conflicted bumps", () => {
    const older = botPr({
      number: 1,
      title: "Bump lodash from 1.0.0 to 1.0.1",
      updatedAt: new Date("2026-01-01"),
      mergeConflict: true,
    });
    const newer = botPr({
      number: 2,
      title: "Bump lodash from 1.0.0 to 1.0.2",
      updatedAt: new Date("2026-02-01"),
    });
    expect(findDependabotSupersededNumbers([older, newer])).toEqual(new Set([1]));
  });
});

describe("Phase 2 rules", () => {
  const policy = defaultPolicy();

  it("C2: closes duplicate PR", () => {
    const ctx = buildEvaluationContext([
      humanPr({ number: 1, closingIssueNumbers: [5] }),
      humanPr({ number: 2, closingIssueNumbers: [5] }),
    ]);
    expect(evaluatePullRequest(humanPr({ number: 2 }), policy, ctx).ruleId).toBe("C2");
  });

  it("C1: closes bot superseded by merged files", () => {
    const ctx = buildEvaluationContext(
      [botPr({ number: 3, createdAt: new Date("2026-01-01"), changedFiles: ["pkg.json"] })],
      [{ number: 10, mergedAt: new Date("2026-03-01"), files: ["pkg.json"] }],
    );
    expect(evaluatePullRequest(botPr({ number: 3, changedFiles: ["pkg.json"] }), policy, ctx).ruleId).toBe(
      "C1",
    );
  });

  it("A3b: closes human PR after stale label + grace", () => {
    const pr = humanPr({
      labels: ["stale"],
      inactiveDays: policy.thresholds.staleWarnDays + policy.thresholds.staleCloseGraceDays,
    });
    expect(evaluatePullRequest(pr, policy).ruleId).toBe("A3b");
    expect(shouldApplyAction(evaluatePullRequest(pr, policy), "full", pr)).toBe(true);
    expect(shouldApplyAction(evaluatePullRequest(pr, policy), "bot-only", pr)).toBe(false);
  });

  it("A3: skips re-warning when stale label already present", () => {
    const pr = humanPr({
      labels: ["stale"],
      inactiveDays: policy.thresholds.staleWarnDays + 1,
    });
    expect(evaluatePullRequest(pr, policy).action).toBe("skip");
  });
});
