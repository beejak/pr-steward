import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import type { PolicyConfig } from "../types.js";
import { assertPolicyHardening } from "./validate.js";

export interface RawPolicy {
  version: number;
  exemption_labels?: string[];
  thresholds?: {
    stale_warn_days?: number;
    stale_close_grace_days?: number;
    draft_close_days?: number;
    ci_failure_close_days?: number;
    bot_security_close_days?: number;
  };
  limits?: {
    max_closures_per_run?: number;
    max_comments_per_run?: number;
  };
  rollout?: {
    mode?: string;
    platforms?: string[];
  };
}

const DEFAULT_PATH = resolve(process.cwd(), "policy/pr-lifecycle.yml");

export function defaultPolicy(): PolicyConfig {
  return {
    exemptionLabels: ["keep-open", "blocked", "do-not-close", "hold", "wip"],
    thresholds: {
      staleWarnDays: 30,
      staleCloseGraceDays: 7,
      draftCloseDays: 30,
      ciFailureCloseDays: 7,
      botSecurityCloseDays: 7,
    },
    limits: {
      maxClosuresPerRun: 20,
      maxCommentsPerRun: 30,
    },
    rollout: { mode: "dry-run" },
  };
}

function parseRolloutMode(mode: string | undefined): PolicyConfig["rollout"]["mode"] {
  if (mode === "bot-only" || mode === "full") return mode;
  return "dry-run";
}

export function parsePolicy(raw: RawPolicy): PolicyConfig {
  const base = defaultPolicy();
  const t = raw.thresholds ?? {};

  return {
    exemptionLabels: raw.exemption_labels ?? base.exemptionLabels,
    thresholds: {
      staleWarnDays: t.stale_warn_days ?? base.thresholds.staleWarnDays,
      staleCloseGraceDays: t.stale_close_grace_days ?? base.thresholds.staleCloseGraceDays,
      draftCloseDays: t.draft_close_days ?? base.thresholds.draftCloseDays,
      ciFailureCloseDays: t.ci_failure_close_days ?? base.thresholds.ciFailureCloseDays,
      botSecurityCloseDays: t.bot_security_close_days ?? base.thresholds.botSecurityCloseDays,
    },
    limits: {
      maxClosuresPerRun: raw.limits?.max_closures_per_run ?? base.limits!.maxClosuresPerRun,
      maxCommentsPerRun: raw.limits?.max_comments_per_run ?? base.limits!.maxCommentsPerRun,
    },
    rollout: {
      mode: parseRolloutMode(raw.rollout?.mode),
    },
  };
}

export function loadPolicy(path: string = DEFAULT_PATH): PolicyConfig {
  const content = readFileSync(path, "utf8");
  const raw = parse(content) as RawPolicy;
  if (raw.version !== 1) {
    throw new Error(`Unsupported policy version: ${raw.version}`);
  }
  const policy = parsePolicy(raw);
  assertPolicyHardening(policy);
  return policy;
}
