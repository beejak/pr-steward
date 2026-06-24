#!/usr/bin/env node
/**
 * Dry-run CLI — evaluates sample PRs against the rule engine.
 * Platform API integration comes in Phase 1.
 */
import { evaluatePullRequest, shouldApplyAction } from "../engine/evaluate.js";
import type { PullRequest } from "../types.js";

const samples: PullRequest[] = [
  {
    id: "gh-1",
    number: 1,
    platform: "github",
    title: "Bump lodash",
    author: "dependabot[bot]",
    isDraft: false,
    isBot: true,
    labels: [],
    updatedAt: new Date(),
    createdAt: new Date(),
    mergeConflict: true,
    checksFailing: true,
    criticalSecurityFinding: false,
    inactiveDays: 10,
  },
  {
    id: "gh-2",
    number: 2,
    platform: "github",
    title: "Add auth module",
    author: "human-dev",
    isDraft: false,
    isBot: false,
    labels: [],
    updatedAt: new Date(),
    createdAt: new Date(),
    mergeConflict: false,
    checksFailing: false,
    criticalSecurityFinding: true,
    inactiveDays: 3,
  },
];

console.log("PR Lifecycle dry-run (policy mode: dry-run)\n");

for (const pr of samples) {
  const decision = evaluatePullRequest(pr);
  const wouldApply = shouldApplyAction(decision, "dry-run", pr);
  console.log(`PR #${pr.number} (${pr.author})`);
  console.log(`  → ${decision.action} [${decision.ruleId}] ${decision.reason}`);
  console.log(`  apply=${wouldApply} confidence=${decision.confidence}\n`);
}
