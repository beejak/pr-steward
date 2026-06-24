import { describe, expect, it } from "vitest";
import { evaluatePullRequest } from "../../src/engine/evaluate.js";
import { defaultPolicy } from "../../src/policy/load.js";
import { botPr, humanPr } from "../helpers/fixtures.js";

describe("evaluatePullRequest", () => {
  const policy = defaultPolicy();

  it("E1: skips PR with exemption label", () => {
    const pr = humanPr({ labels: ["keep-open"] });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "skip",
      ruleId: "E1",
    });
  });

  it("G3: warns on human PR with critical security finding", () => {
    const pr = humanPr({ criticalSecurityFinding: true, inactiveDays: 3 });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "warn",
      ruleId: "G3",
    });
  });

  it("G2: closes inactive bot PR with critical security finding", () => {
    const pr = botPr({ criticalSecurityFinding: true, inactiveDays: 7 });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "close",
      ruleId: "G2",
    });
  });

  it("G2: does not close bot security PR before threshold", () => {
    const pr = botPr({ criticalSecurityFinding: true, inactiveDays: 6 });
    const d = evaluatePullRequest(pr, policy);
    expect(d.ruleId).not.toBe("G2");
  });

  it("A2: closes inactive draft PR", () => {
    const pr = humanPr({ isDraft: true, inactiveDays: 30 });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "close",
      ruleId: "A2",
    });
  });

  it("B3: closes bot PR with failing CI after inactivity threshold", () => {
    const pr = botPr({ checksFailing: true, inactiveDays: 10 });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "close",
      ruleId: "B3",
    });
  });

  it("B3: closes PR with merge conflict after inactivity threshold", () => {
    const pr = botPr({ mergeConflict: true, inactiveDays: 8 });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "close",
      ruleId: "B3",
    });
  });

  it("B3: skips blocked PR below inactivity threshold", () => {
    const pr = botPr({ checksFailing: true, inactiveDays: 3 });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "skip",
      ruleId: "none",
    });
  });

  it("A3: warns on stale human ready-for-review PR", () => {
    const pr = humanPr({ inactiveDays: 35 });
    expect(evaluatePullRequest(pr, policy)).toMatchObject({
      action: "warn",
      ruleId: "A3",
    });
  });

  it("A3: does not warn human PR below stale threshold", () => {
    const pr = humanPr({ inactiveDays: 10 });
    expect(evaluatePullRequest(pr, policy).ruleId).toBe("none");
  });
});
