import { describe, expect, it } from "vitest";
import { evaluatePullRequest, shouldApplyAction } from "../../src/engine/evaluate.js";
import { defaultPolicy } from "../../src/policy/load.js";
import { botPr, humanPr } from "../helpers/fixtures.js";

describe("shouldApplyAction", () => {
  const policy = defaultPolicy();

  it("dry-run never applies any action", () => {
    const pr = botPr({ checksFailing: true, inactiveDays: 10 });
    const decision = evaluatePullRequest(pr, policy);
    expect(decision.action).toBe("close");
    expect(shouldApplyAction(decision, "dry-run", pr)).toBe(false);
  });

  it("bot-only applies close for bot PR", () => {
    const pr = botPr({ checksFailing: true, inactiveDays: 10 });
    const decision = evaluatePullRequest(pr, policy);
    expect(shouldApplyAction(decision, "bot-only", pr)).toBe(true);
  });

  it("bot-only does not apply close for human PR", () => {
    const pr = humanPr({ isDraft: true, inactiveDays: 30 });
    const decision = evaluatePullRequest(pr, policy);
    expect(decision.action).toBe("close");
    expect(shouldApplyAction(decision, "bot-only", pr)).toBe(false);
  });

  it("bot-only applies warn for human PR", () => {
    const pr = humanPr({ inactiveDays: 35 });
    const decision = evaluatePullRequest(pr, policy);
    expect(decision.action).toBe("warn");
    expect(shouldApplyAction(decision, "bot-only", pr)).toBe(true);
  });

  it("full applies close for human draft", () => {
    const pr = humanPr({ isDraft: true, inactiveDays: 30 });
    const decision = evaluatePullRequest(pr, policy);
    expect(shouldApplyAction(decision, "full", pr)).toBe(true);
  });

  it("skip decisions are never applied", () => {
    const pr = humanPr({ labels: ["keep-open"] });
    const decision = evaluatePullRequest(pr, policy);
    expect(shouldApplyAction(decision, "full", pr)).toBe(false);
  });
});
