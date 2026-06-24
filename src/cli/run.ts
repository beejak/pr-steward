#!/usr/bin/env node
import { loadPolicy } from "../policy/load.js";
import { LifecycleRunner } from "../runner/lifecycle.js";
import { GitHubClient } from "../platform/github/client.js";

function parseRepo(): { owner: string; repo: string } {
  const env = process.env.GITHUB_REPOSITORY;
  if (env?.includes("/")) {
    const [owner, repo] = env.split("/");
    return { owner, repo };
  }
  return { owner: "beejak", repo: "pr-steward" };
}

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN or GH_TOKEN required");
    process.exit(1);
  }

  const policy = loadPolicy();
  const { owner, repo } = parseRepo();
  const client = new GitHubClient({ owner, repo, token });
  const runner = new LifecycleRunner(client, policy);

  const summary = await runner.run();

  console.log(JSON.stringify(summary, null, 2));

  const actionable = summary.results.filter(
    (r) => r.decision.action === "close" || r.decision.action === "warn",
  );

  if (actionable.length > 0) {
    console.log("\n--- Summary ---");
    for (const { pr, decision, applied, skippedReason } of actionable) {
      const status = applied ? "APPLIED" : `SKIPPED (${skippedReason})`;
      console.log(`PR #${pr.number} [${pr.author}] → ${decision.action} (${decision.ruleId}) ${status}`);
    }
  } else {
    console.log("\nNo PRs matched close/warn rules.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
