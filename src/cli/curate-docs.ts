#!/usr/bin/env node
/**
 * Documentation curator — scans repo facts and regenerates markdown docs.
 *
 * Usage:
 *   npm run docs:curate [-- --dry-run] [-- --agent] [-- --context-only]
 */
import { resolve } from "node:path";
import { curateDocs } from "../curator/generate.js";

function parseArgs(argv: string[]): {
  dryRun: boolean;
  useAgent: boolean;
  contextOnly: boolean;
} {
  return {
    dryRun: argv.includes("--dry-run"),
    useAgent: argv.includes("--agent"),
    contextOnly: argv.includes("--context-only"),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = resolve(process.cwd());

  console.log(`pr-steward docs curator (root: ${rootDir})\n`);

  const result = await curateDocs({
    rootDir,
    dryRun: args.dryRun,
    useAgent: args.useAgent,
    contextOnly: args.contextOnly,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL,
    deepseekModel: process.env.DEEPSEEK_MODEL,
  });

  console.log(`\nContext: ${result.contextPath}`);
  console.log(`Files: ${result.filesWritten.length}`);
  if (result.agentUsed) console.log("Agent: DeepSeek polished README");
  else if (args.useAgent) console.log("Agent: skipped (no API key or API failed)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
