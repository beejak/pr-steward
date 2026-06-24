import type { PullRequest } from "../types.js";

const BASE: PullRequest = {
  id: "gh-1",
  number: 1,
  platform: "github",
  title: "Example PR",
  author: "human-dev",
  isDraft: false,
  isBot: false,
  labels: [],
  updatedAt: new Date("2026-01-01"),
  createdAt: new Date("2025-12-01"),
  mergeConflict: false,
  checksFailing: false,
  criticalSecurityFinding: false,
  inactiveDays: 0,
};

export function humanPr(overrides: Partial<PullRequest> = {}): PullRequest {
  return { ...BASE, id: `gh-human-${overrides.number ?? 1}`, ...overrides };
}

export function botPr(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    ...BASE,
    id: `gh-bot-${overrides.number ?? 1}`,
    author: "dependabot[bot]",
    isBot: true,
    title: overrides.title ?? "Bump lodash",
    ...overrides,
  };
}
