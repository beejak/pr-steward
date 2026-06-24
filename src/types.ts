export type PullRequestAction = "close" | "warn" | "skip" | "agent_review" | "defer" | "error";

export interface PullRequest {
  id: string;
  number: number;
  platform: "github" | "gitlab";
  title: string;
  body?: string;
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
  changedFiles?: string[];
  closingIssueNumbers?: number[];
}

export interface MergedPullRequest {
  number: number;
  mergedAt: Date;
  files: string[];
}

export interface EvaluationContext {
  mergedPullRequests: MergedPullRequest[];
  duplicatePrNumbers: ReadonlySet<number>;
  dependabotSupersededNumbers: ReadonlySet<number>;
}

export const EMPTY_CONTEXT: EvaluationContext = {
  mergedPullRequests: [],
  duplicatePrNumbers: new Set(),
  dependabotSupersededNumbers: new Set(),
};

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
