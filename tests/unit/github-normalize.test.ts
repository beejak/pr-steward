import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checksAreFailing,
  isBotAuthor,
  normalizeGitHubPull,
  type GitHubPullRaw,
} from "../../src/platform/github/normalize.js";

describe("normalizeGitHubPull", () => {
  const fixturePath = resolve(
    process.cwd(),
    "tests/fixtures/github/list-open-prs.json",
  );
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as GitHubPullRaw[];
  const now = new Date("2026-06-20T10:00:00Z");

  it("detects dependabot bot author", () => {
    expect(isBotAuthor("dependabot[bot]")).toBe(true);
    expect(isBotAuthor("beejak")).toBe(false);
  });

  it("normalizes bot PR with conflict and failing checks", () => {
    const pr = normalizeGitHubPull(raw[0], "beejak/pr-steward", now);
    expect(pr.isBot).toBe(true);
    expect(pr.mergeConflict).toBe(true);
    expect(pr.checksFailing).toBe(true);
    expect(pr.inactiveDays).toBeGreaterThanOrEqual(40);
  });

  it("normalizes human PR with security label", () => {
    const pr = normalizeGitHubPull(raw[1], "beejak/pr-steward", now);
    expect(pr.isBot).toBe(false);
    expect(pr.criticalSecurityFinding).toBe(true);
  });

  it("checksAreFailing handles rollup conclusions", () => {
    expect(checksAreFailing([{ conclusion: "FAILURE" }])).toBe(true);
    expect(checksAreFailing([{ conclusion: "SUCCESS" }])).toBe(false);
    expect(checksAreFailing([])).toBe(false);
  });
});
