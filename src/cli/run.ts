#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPolicy } from "../policy/load.js";
import { validatePolicyHardening } from "../policy/validate.js";
import { LifecycleRunner } from "../runner/lifecycle.js";
import { formatRuleStatsMarkdown } from "../runner/metrics.js";
import { GitHubClient } from "../platform/github/client.js";

function parseRepo(): { owner: string; repo: string } {
  const env =
    process.env.PR_STEWARD_TARGET_REPO ?? process.env.GITHUB_REPOSITORY;
  if (env?.includes("/")) {
    const [owner, repo] = env.split("/");
    return { owner, repo };
  }
  return { owner: "beejak", repo: "pr-steward" };
}

function parseTriageProvider(): "auto" | "deepseek" | "cursor" | "heuristic" | undefined {
  const raw = process.env.PR_STEWARD_TRIAGE_PROVIDER;
  if (raw === "auto" || raw === "deepseek" || raw === "cursor" || raw === "heuristic") {
    return raw;
  }
  return undefined;
}

function writeReport(summary: Awaited<ReturnType<LifecycleRunner["run"]>>): string {
  const reportPath = resolve(process.cwd(), "pr-lifecycle-report.json");
  const serializable = {
    ...summary,
    results: summary.results.map((r) => ({
      pr: {
        number: r.pr.number,
        author: r.pr.author,
        title: r.pr.title,
        isBot: r.pr.isBot,
        inactiveDays: r.pr.inactiveDays,
        labels: r.pr.labels,
      },
      decision: r.decision,
      applied: r.applied,
      skippedReason: r.skippedReason,
    })),
  };
  writeFileSync(reportPath, JSON.stringify(serializable, null, 2));
  return reportPath;
}

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN or GH_TOKEN required");
    process.exit(1);
  }

  const policy = loadPolicy();
  for (const issue of validatePolicyHardening(policy)) {
    if (issue.level === "warning") {
      console.warn(`Policy warning: ${issue.message}`);
    }
  }

  const { owner, repo } = parseRepo();
  const repository = process.env.PR_STEWARD_TARGET_REPO ?? process.env.GITHUB_REPOSITORY ?? `${owner}/${repo}`;
  const client = new GitHubClient({ owner, repo, token });
  const runner = new LifecycleRunner(client, policy, {
    cursorApiKey: process.env.CURSOR_API_KEY,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    triageProvider: parseTriageProvider(),
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL,
    deepseekModel: process.env.DEEPSEEK_MODEL,
    repository,
  });

  const summary = await runner.run();
  const reportPath = writeReport(summary);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nReport written to ${reportPath}`);

  const actionable = summary.results.filter(
    (r) => r.decision.action === "close" || r.decision.action === "warn",
  );

  const summaryLines = [
    `### pr-steward run (mode: ${summary.mode})`,
    "",
    `- Repository: ${summary.runMetadata.repository}`,
    `- Triage provider: ${summary.runMetadata.triageProvider}`,
    `- Timestamp: ${summary.runMetadata.timestamp}`,
    `- Evaluated: ${summary.evaluated}`,
    `- Agent triaged: ${summary.agentTriaged}`,
    `- Would close/warn: ${actionable.length}`,
    `- Applied: ${summary.closuresApplied} closes, ${summary.warningsApplied} warns`,
    `- Reopened after steward: ${summary.reopenedAfterSteward.length}`,
    "",
    "#### Rule stats",
    "",
    formatRuleStatsMarkdown(summary.ruleStats),
    "",
  ];

  if (actionable.length > 0) {
    summaryLines.push("| PR | Author | Action | Rule | Status |");
    summaryLines.push("|----|--------|--------|------|--------|");
    for (const { pr, decision, applied, skippedReason } of actionable) {
      const status = applied ? "APPLIED" : `SKIPPED (${skippedReason})`;
      summaryLines.push(
        `| #${pr.number} | ${pr.author} | ${decision.action} | ${decision.ruleId} | ${status} |`,
      );
    }
  } else {
    summaryLines.push("No PRs matched close/warn rules.");
  }

  const md = summaryLines.join("\n");
  console.log(`\n${md}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
