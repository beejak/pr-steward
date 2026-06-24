#!/usr/bin/env node
/**
 * Local dry-run — evaluates built-in sample PRs against loaded policy.
 */
import { evaluatePullRequest, shouldApplyAction } from "../engine/evaluate.js";
import { loadPolicy } from "../policy/load.js";
import { botPr, humanPr } from "../fixtures/pr-samples.js";

const policy = loadPolicy();
const samples = [
  botPr({ checksFailing: true, inactiveDays: 10 }),
  humanPr({ criticalSecurityFinding: true, inactiveDays: 3 }),
  humanPr({ inactiveDays: 35 }),
];

console.log(`PR Lifecycle dry-run (rollout: ${policy.rollout.mode})\n`);

for (const pr of samples) {
  const decision = evaluatePullRequest(pr, policy);
  const wouldApply = shouldApplyAction(decision, policy.rollout.mode, pr);
  console.log(`PR #${pr.number} (${pr.author})`);
  console.log(`  → ${decision.action} [${decision.ruleId}] ${decision.reason}`);
  console.log(`  apply=${wouldApply} confidence=${decision.confidence}\n`);
}
