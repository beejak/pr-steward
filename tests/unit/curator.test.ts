import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import {
  buildCuratorContext,
  parseMakefileTargets,
  parseNpmScripts,
  parseWorkflows,
} from "../../src/curator/context.js";
import { generateAllDocs } from "../../src/curator/templates.js";

const ROOT = resolve(import.meta.dirname, "../..");

describe("curator context", () => {
  it("parses Makefile targets with descriptions", () => {
    const targets = parseMakefileTargets(resolve(ROOT, "Makefile"));
    const names = targets.map((t) => t.name);
    expect(names).toContain("test");
    expect(names).toContain("docs-curate");
    const testTarget = targets.find((t) => t.name === "test");
    expect(testTarget?.description).toMatch(/test/i);
  });

  it("parses npm scripts from package.json", () => {
    const scripts = parseNpmScripts(resolve(ROOT, "package.json"));
    expect(scripts.some((s) => s.name === "docs:curate")).toBe(true);
    expect(scripts.some((s) => s.name === "pr-lifecycle:dry-run")).toBe(true);
  });

  it("parses workflow metadata", () => {
    const workflows = parseWorkflows(resolve(ROOT, ".github/workflows"));
    expect(workflows.length).toBeGreaterThanOrEqual(2);
    const lifecycle = workflows.find((w) => w.file === "pr-lifecycle.yml");
    expect(lifecycle?.triggers).toContain("workflow_dispatch");
  });

  it("builds full context snapshot with policy rollout mode", () => {
    const ctx = buildCuratorContext(ROOT);
    expect(ctx.repo.name).toBe("pr-steward");
    expect(ctx.policy.rolloutMode).toBe("bot-only");
    expect(ctx.policy.ruleIds).toContain("C6");
    expect(ctx.sourceModules).toContain("curator");
    expect(ctx.makeTargets.length).toBeGreaterThan(0);
    expect(ctx.envVars.some((v) => v.includes("DEEPSEEK"))).toBe(true);
  });

  it("generates all doc files from context", () => {
    const ctx = buildCuratorContext(ROOT);
    const docs = generateAllDocs(ctx);
    expect(docs["README.md"]).toContain("pr-steward");
    expect(docs["README.md"]).toContain("bot-only");
    expect(docs["docs/architecture.md"]).toContain("mermaid");
    expect(docs["docs/what-we-dont-do.md"]).toContain("does **not**");
    expect(docs["docs/commands.md"]).toContain("docs:curate");
  });
});
