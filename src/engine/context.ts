import type { EvaluationContext, MergedPullRequest, PullRequest } from "../types.js";
import { parseClosingIssues, parseDependabotPackage } from "./helpers.js";

export function findDuplicatePrNumbers(pullRequests: PullRequest[]): Set<number> {
  const byIssue = new Map<number, PullRequest[]>();

  for (const pr of pullRequests) {
    const issues = pr.closingIssueNumbers ?? [];
    if (issues.length !== 1) continue;
    const issue = issues[0];
    const group = byIssue.get(issue) ?? [];
    group.push(pr);
    byIssue.set(issue, group);
  }

  const duplicates = new Set<number>();
  for (const group of byIssue.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (const pr of sorted.slice(1)) {
      duplicates.add(pr.number);
    }
  }
  return duplicates;
}

export function findDependabotSupersededNumbers(pullRequests: PullRequest[]): Set<number> {
  const byPackage = new Map<string, PullRequest[]>();

  for (const pr of pullRequests) {
    if (!pr.isBot) continue;
    const pkg = parseDependabotPackage(pr.title);
    if (!pkg) continue;
    const group = byPackage.get(pkg) ?? [];
    group.push(pr);
    byPackage.set(pkg, group);
  }

  const superseded = new Set<number>();
  for (const group of byPackage.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    const newest = sorted[0];
    for (const pr of sorted.slice(1)) {
      if (pr.mergeConflict || pr.updatedAt < newest.updatedAt) {
        superseded.add(pr.number);
      }
    }
  }
  return superseded;
}

export function buildEvaluationContext(
  openPullRequests: PullRequest[],
  mergedPullRequests: MergedPullRequest[] = [],
): EvaluationContext {
  const enriched = openPullRequests.map((pr) => ({
    ...pr,
    closingIssueNumbers:
      pr.closingIssueNumbers ??
      parseClosingIssues(`${pr.title}\n${pr.body ?? ""}`),
  }));

  return {
    mergedPullRequests,
    duplicatePrNumbers: findDuplicatePrNumbers(enriched),
    dependabotSupersededNumbers: findDependabotSupersededNumbers(enriched),
  };
}
