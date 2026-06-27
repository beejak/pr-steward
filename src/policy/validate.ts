import type { PolicyConfig } from "../types.js";

export interface PolicyValidationIssue {
  level: "warning" | "error";
  message: string;
}

export function validatePolicyHardening(policy: PolicyConfig): PolicyValidationIssue[] {
  const issues: PolicyValidationIssue[] = [];

  const maxClosures = policy.limits?.maxClosuresPerRun ?? 20;
  const maxComments = policy.limits?.maxCommentsPerRun ?? 30;

  if (maxClosures <= 0) {
    issues.push({ level: "error", message: "limits.maxClosuresPerRun must be positive" });
  }
  if (maxComments <= 0) {
    issues.push({ level: "error", message: "limits.maxCommentsPerRun must be positive" });
  }
  if (maxClosures > 50) {
    issues.push({
      level: "warning",
      message: "limits.maxClosuresPerRun > 50 may cause mass closures in one run",
    });
  }

  if (policy.thresholds.staleWarnDays < 1) {
    issues.push({ level: "error", message: "thresholds.staleWarnDays must be at least 1" });
  }
  if (policy.thresholds.staleCloseGraceDays < 0) {
    issues.push({ level: "error", message: "thresholds.staleCloseGraceDays cannot be negative" });
  }
  if (policy.rollout.mode === "full" && policy.thresholds.staleCloseGraceDays === 0) {
    issues.push({
      level: "warning",
      message: "full rollout with zero stale close grace removes human warning period",
    });
  }

  return issues;
}

export function assertPolicyHardening(policy: PolicyConfig): void {
  const errors = validatePolicyHardening(policy).filter((i) => i.level === "error");
  if (errors.length > 0) {
    throw new Error(`Policy validation failed: ${errors.map((e) => e.message).join("; ")}`);
  }
}
