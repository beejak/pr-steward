import type { PullRequest } from "../../src/types.js";
import { evaluatePullRequest, shouldApplyAction } from "../../src/engine/evaluate.js";
import { defaultPolicy, loadPolicy, parsePolicy } from "../../src/policy/load.js";
import { botPr } from "../helpers/fixtures.js";
import { describe, expect, it } from "vitest";

describe("loadPolicy", () => {
  it("loads policy/pr-lifecycle.yml", () => {
    const policy = loadPolicy();
    expect(policy.rollout.mode).toBe("bot-only");
    expect(policy.thresholds.ciFailureCloseDays).toBe(7);
    expect(policy.exemptionLabels).toContain("keep-open");
  });

  it("respects custom ci_failure_close_days threshold", () => {
    const policy = parsePolicy({
      version: 1,
      thresholds: { ci_failure_close_days: 5 },
    });
    const below = botPr({ checksFailing: true, inactiveDays: 4 });
    const above = botPr({ checksFailing: true, inactiveDays: 5 });
    expect(evaluatePullRequest(below, policy).action).toBe("skip");
    expect(evaluatePullRequest(above, policy).action).toBe("close");
  });

  it("parses rollout mode bot-only", () => {
    const policy = parsePolicy({ version: 1, rollout: { mode: "bot-only" } });
    expect(policy.rollout.mode).toBe("bot-only");
    const pr = botPr({ checksFailing: true, inactiveDays: 10 });
    const decision = evaluatePullRequest(pr, policy);
    expect(shouldApplyAction(decision, policy.rollout.mode, pr)).toBe(true);
  });

  it("defaultPolicy matches loader defaults", () => {
    const loaded = loadPolicy();
    const defaults = defaultPolicy();
    expect(loaded.thresholds).toEqual(defaults.thresholds);
  });
});
