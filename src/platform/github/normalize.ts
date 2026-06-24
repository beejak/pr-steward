import type { PullRequest } from "../../types.js";

const BOT_SUFFIX = /\[bot\]$/i;
const FAILING_CONCLUSIONS = new Set([
  "FAILURE",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE",
  "CANCELLED",
]);

export interface GitHubPullRaw {
  number: number;
  title: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  user: { login: string };
  labels: Array<{ name: string }>;
  mergeable_state?: string;
  statusCheckRollup?: Array<{ state?: string; conclusion?: string | null }>;
}

export function isBotAuthor(login: string): boolean {
  return BOT_SUFFIX.test(login) || login === "dependabot[bot]";
}

export function daysSince(isoDate: string, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(isoDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function checksAreFailing(rollup: GitHubPullRaw["statusCheckRollup"]): boolean {
  if (!rollup?.length) return false;
  return rollup.some((check) => {
    if (check.conclusion) return FAILING_CONCLUSIONS.has(check.conclusion);
    return check.state === "FAILURE";
  });
}

export function hasMergeConflict(mergeableState: string | undefined): boolean {
  return mergeableState === "dirty" || mergeableState === "DIRTY";
}

export function hasSecurityLabel(
  labels: string[],
  securityLabels: string[] = ["security:findings", "security:review-required", "security:secret-detected"],
): boolean {
  return labels.some((l) => securityLabels.includes(l));
}

export function normalizeGitHubPull(
  raw: GitHubPullRaw,
  repo: string,
  now: Date = new Date(),
): PullRequest {
  const labels = raw.labels.map((l) => l.name);
  const author = raw.user.login;

  return {
    id: `github:${repo}#${raw.number}`,
    number: raw.number,
    platform: "github",
    title: raw.title,
    author,
    isDraft: raw.draft,
    isBot: isBotAuthor(author),
    labels,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
    mergeConflict: hasMergeConflict(raw.mergeable_state),
    checksFailing: checksAreFailing(raw.statusCheckRollup),
    criticalSecurityFinding: hasSecurityLabel(labels),
    inactiveDays: daysSince(raw.updated_at, now),
  };
}
