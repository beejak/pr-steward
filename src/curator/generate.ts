import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { polishReadmeWithDeepSeek } from "./agent.js";
import { buildCuratorContext, writeContextSnapshot } from "./context.js";
import { generateAllDocs } from "./templates.js";
import type { CurateOptions, CurateResult } from "./types.js";

export async function curateDocs(options: CurateOptions): Promise<CurateResult> {
  const rootDir = resolve(options.rootDir);
  const context = buildCuratorContext(rootDir);
  const contextPath = writeContextSnapshot(rootDir, context);

  if (options.contextOnly) {
    return { contextPath, filesWritten: [contextPath], agentUsed: false };
  }

  const docs = generateAllDocs(context);
  let agentUsed = false;

  if (options.useAgent && options.deepseekApiKey) {
    const polished = await polishReadmeWithDeepSeek(docs["README.md"], context, {
      apiKey: options.deepseekApiKey,
      baseUrl: options.deepseekBaseUrl,
      model: options.deepseekModel,
    });
    if (polished) {
      docs["README.md"] = polished;
      agentUsed = true;
    }
  }

  const filesWritten: string[] = [contextPath];

  for (const [relPath, content] of Object.entries(docs)) {
    const absPath = resolve(rootDir, relPath);
    if (options.dryRun) {
      console.log(`[dry-run] would write ${relPath} (${content.length} bytes)`);
      continue;
    }
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content);
    filesWritten.push(absPath);
    console.log(`Wrote ${relPath}`);
  }

  return { contextPath, filesWritten, agentUsed };
}
