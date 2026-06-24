import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPolicy } from "../policy/load.js";
import type { CuratorContext, MakeTarget, NpmScript, WorkflowInfo } from "./types.js";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function parseMakefileTargets(makefilePath: string): MakeTarget[] {
  if (!existsSync(makefilePath)) return [];
  const content = readFileSync(makefilePath, "utf8");
  const targets: MakeTarget[] = [];
  const seen = new Set<string>();

  // Parse help section: @echo "  target    Description"
  for (const line of content.split("\n")) {
    const helpMatch = line.match(/^\s*@echo\s+"\s+([a-z][a-z0-9_-]*)\s{2,}(.+)"\s*$/);
    if (helpMatch) {
      targets.push({ name: helpMatch[1], description: helpMatch[2] });
      seen.add(helpMatch[1]);
    }
  }

  // Include targets defined but missing from help
  for (const line of content.split("\n")) {
    const targetMatch = line.match(/^([a-z][a-z0-9_-]*):/);
    if (targetMatch && !targetMatch[1].startsWith(".") && !seen.has(targetMatch[1])) {
      targets.push({ name: targetMatch[1] });
      seen.add(targetMatch[1]);
    }
  }

  return targets;
}

export function parseNpmScripts(packagePath: string): NpmScript[] {
  const pkg = readJson<{ scripts?: Record<string, string> }>(packagePath);
  return Object.entries(pkg.scripts ?? {}).map(([name, command]) => ({ name, command }));
}

export function parseWorkflows(workflowsDir: string): WorkflowInfo[] {
  if (!existsSync(workflowsDir)) return [];
  return readdirSync(workflowsDir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((file) => {
      const content = readFileSync(join(workflowsDir, file), "utf8");
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const triggers: string[] = [];
      if (/^\s*schedule:/m.test(content)) triggers.push("schedule");
      if (/workflow_dispatch:/m.test(content)) triggers.push("workflow_dispatch");
      if (/^\s*pull_request:/m.test(content)) triggers.push("pull_request");
      if (/^\s*push:/m.test(content)) triggers.push("push");
      return {
        file,
        name: nameMatch?.[1]?.trim() ?? file,
        triggers,
      };
    });
}

function listSourceModules(srcDir: string): string[] {
  if (!existsSync(srcDir)) return [];
  const modules: string[] = [];
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) modules.push(entry.name);
  }
  return modules.sort();
}

function parseEnvExample(envPath: string): string[] {
  if (!existsSync(envPath)) return [];
  return readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => /^[A-Z][A-Z0-9_]+=/.test(line) || /^# [A-Z][A-Z0-9_]+/.test(line))
    .map((line) => line.replace(/^#\s*/, "").split("=")[0].trim())
    .filter((name) => name.length > 0);
}

function safeGit(command: string, cwd: string): string {
  try {
    return execSync(command, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

export function buildCuratorContext(rootDir: string): CuratorContext {
  const pkgPath = join(rootDir, "package.json");
  const pkg = readJson<{
    name: string;
    version: string;
    description?: string;
    engines?: { node?: string };
  }>(pkgPath);

  const policy = loadPolicy(join(rootDir, "policy/pr-lifecycle.yml"));

  const techStack = [
    "TypeScript (Node.js ≥20, ESM)",
    "Vitest",
    "YAML policy (`policy/pr-lifecycle.yml`)",
    "GitHub Actions + GitLab CI scaffold",
    "Gitleaks + Semgrep + CodeQL (tiered security)",
    "DeepSeek API (agent triage, optional)",
    "Cursor SDK (agent triage, optional)",
  ];

  const recentCommits = safeGit('git log -10 --oneline --no-decorate', rootDir)
    .split("\n")
    .filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    repo: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description ?? "",
      nodeEngine: pkg.engines?.node ?? ">=20",
    },
    techStack,
    policy: {
      version: 1,
      rolloutMode: policy.rollout.mode,
      ruleIds: ["E1", "A2", "C3", "B3", "G2", "G3", "A3", "C6"],
      exemptionLabels: policy.exemptionLabels,
      thresholds: {
        staleWarnDays: policy.thresholds.staleWarnDays,
        staleCloseGraceDays: policy.thresholds.staleCloseGraceDays,
        draftCloseDays: policy.thresholds.draftCloseDays,
        ciFailureCloseDays: policy.thresholds.ciFailureCloseDays,
        botSecurityCloseDays: policy.thresholds.botSecurityCloseDays,
      },
      limits: {
        maxClosuresPerRun: policy.limits?.maxClosuresPerRun ?? 20,
        maxCommentsPerRun: policy.limits?.maxCommentsPerRun ?? 30,
      },
    },
    makeTargets: parseMakefileTargets(join(rootDir, "Makefile")),
    npmScripts: parseNpmScripts(pkgPath),
    workflows: parseWorkflows(join(rootDir, ".github/workflows")),
    sourceModules: listSourceModules(join(rootDir, "src")),
    envVars: parseEnvExample(join(rootDir, ".env.example")),
    gitSummary: {
      recentCommits,
      branch: safeGit("git rev-parse --abbrev-ref HEAD", rootDir) || "unknown",
    },
  };
}

export function writeContextSnapshot(rootDir: string, context: CuratorContext): string {
  const contextPath = resolve(rootDir, "docs/.curator-context.json");
  mkdirSync(resolve(rootDir, "docs"), { recursive: true });
  writeFileSync(contextPath, JSON.stringify(context, null, 2) + "\n");
  return contextPath;
}
