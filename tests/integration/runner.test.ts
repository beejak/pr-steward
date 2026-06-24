import { describe, expect, it } from "vitest";
import { LifecycleRunner } from "../../src/runner/lifecycle.js";
import { parsePolicy } from "../../src/policy/load.js";
import { MockPlatformClient } from "../../src/platform/client.js";
import { botPr, humanPr } from "../helpers/fixtures.js";

describe("LifecycleRunner", () => {
  it("dry-run evaluates PRs but performs zero writes", async () => {
    const client = new MockPlatformClient([
      botPr({ number: 1, checksFailing: true, inactiveDays: 10 }),
      humanPr({ number: 2, inactiveDays: 35 }),
    ]);
    const policy = parsePolicy({ version: 1, rollout: { mode: "dry-run" } });
    const runner = new LifecycleRunner(client, policy);
    const summary = await runner.run();

    expect(summary.evaluated).toBe(2);
    expect(summary.closuresApplied).toBe(0);
    expect(summary.results.every((r) => !r.applied)).toBe(true);
    expect(client.calls.filter((c) => c.method !== "listOpenPullRequests")).toHaveLength(0);
  });

  it("bot-only closes bot PR and warns human but does not close human draft", async () => {
    const client = new MockPlatformClient([
      botPr({ number: 1, checksFailing: true, inactiveDays: 10 }),
      humanPr({ number: 2, inactiveDays: 35 }),
      humanPr({ number: 3, isDraft: true, inactiveDays: 30 }),
    ]);
    const policy = parsePolicy({ version: 1, rollout: { mode: "bot-only" } });
    const summary = await new LifecycleRunner(client, policy).run();

    expect(summary.closuresApplied).toBe(1);
    expect(client.calls.some((c) => c.method === "closePullRequest" && c.args[0] === 1)).toBe(
      true,
    );
    expect(client.calls.some((c) => c.method === "closePullRequest" && c.args[0] === 3)).toBe(
      false,
    );
    expect(client.calls.some((c) => c.method === "addComment" && c.args[0] === 2)).toBe(true);
  });

  it("respects max_closures_per_run limit", async () => {
    const client = new MockPlatformClient([
      botPr({ number: 1, checksFailing: true, inactiveDays: 10 }),
      botPr({ number: 2, checksFailing: true, inactiveDays: 10 }),
    ]);
    const policy = parsePolicy({
      version: 1,
      rollout: { mode: "full" },
      limits: { max_closures_per_run: 1, max_comments_per_run: 10 },
    });
    const summary = await new LifecycleRunner(client, policy).run();
    expect(summary.closuresApplied).toBe(1);
    expect(summary.results.filter((r) => r.skippedReason === "max closures per run")).toHaveLength(
      1,
    );
  });
});
