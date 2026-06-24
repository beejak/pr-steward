export type PullRequestAction = "close" | "warn" | "skip" | "agent_review" | "defer" | "error";

export interface PullRequest {
  id: string;
  number: number;
  platform: "github" | "gitlab";
  title: string;
  author: string;
  isDraft: boolean;
  isBot: boolean;
  labels: string[];
  updatedAt: Date;
  createdAt: Date;
  mergeConflict: boolean;
  checksFailing: boolean;
  criticalSecurityFinding: boolean;
  inactiveDays: number;
}

export interface RuleDecision {
  action: PullRequestAction;
  ruleId: string;
  reason: string;
  confidence: number;
}

export interface PolicyConfig {
  exemptionLabels: string[];
  thresholds: {
    staleWarnDays: number;
    staleCloseGraceDays: number;
    draftCloseDays: number;
    ciFailureCloseDays: number;
    botSecurityCloseDays: number;
  };
  limits?: {
    maxClosuresPerRun: number;
    maxCommentsPerRun: number;
  };
  rollout: {
    mode: "dry-run" | "bot-only" | "full";
  };
}
