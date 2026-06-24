/** Parse "Closes #123" style references from PR title + body. */
export function parseClosingIssues(text: string): number[] {
  const pattern = /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi;
  const issues = new Set<number>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    issues.add(Number.parseInt(match[1], 10));
  }
  return [...issues];
}

/** Dependabot titles: "Bump lodash from 4.17.20 to 4.17.21" */
export function parseDependabotPackage(title: string): string | undefined {
  const bump = title.match(/^Bump\s+(\S+)\s+from\s+/i);
  if (bump) return bump[1].toLowerCase();
  const update = title.match(/^Update\s+requirement\s+for\s+(\S+)\s+from\s+/i);
  if (update) return update[1].toLowerCase();
  return undefined;
}

export function filesOverlap(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  return a.some((f) => setB.has(f));
}

export function isSupersededByMergedWork(
  pr: { createdAt: Date; changedFiles?: string[] },
  merged: Array<{ mergedAt: Date; files: string[] }>,
): boolean {
  const files = pr.changedFiles ?? [];
  if (files.length === 0) return false;
  return merged.some(
    (m) => m.mergedAt > pr.createdAt && filesOverlap(files, m.files),
  );
}
