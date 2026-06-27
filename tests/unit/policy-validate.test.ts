import { describe, expect, it } from "vitest";
import { parsePolicy } from "../../src/policy/load.js";
import { validatePolicyHardening } from "../../src/policy/validate.js";

describe("validatePolicyHardening", () => {
  it("returns error when maxClosuresPerRun is zero", () => {
    const policy = parsePolicy({
      version: 1,
      limits: { max_closures_per_run: 0, max_comments_per_run: 10 },
    });
    const issues = validatePolicyHardening(policy);
    expect(issues.some((i) => i.level === "error" && i.message.includes("maxClosuresPerRun"))).toBe(
      true,
    );
  });

  it("warns on full rollout with zero stale grace", () => {
    const policy = parsePolicy({
      version: 1,
      rollout: { mode: "full" },
      thresholds: { stale_close_grace_days: 0 },
    });
    const issues = validatePolicyHardening(policy);
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });
});
