export interface MakeTarget {
  name: string;
  description?: string;
}

export interface NpmScript {
  name: string;
  command: string;
}

export interface WorkflowInfo {
  file: string;
  name: string;
  triggers: string[];
}

export interface PolicySnapshot {
  version: number;
  rolloutMode: string;
  ruleIds: string[];
  exemptionLabels: string[];
  thresholds: Record<string, number>;
  limits: Record<string, number>;
}

export interface CuratorContext {
  generatedAt: string;
  repo: {
    name: string;
    version: string;
    description: string;
    nodeEngine: string;
  };
  techStack: string[];
  policy: PolicySnapshot;
  makeTargets: MakeTarget[];
  npmScripts: NpmScript[];
  workflows: WorkflowInfo[];
  sourceModules: string[];
  envVars: string[];
  gitSummary: {
    recentCommits: string[];
    branch: string;
  };
}

export interface CurateOptions {
  rootDir: string;
  dryRun?: boolean;
  useAgent?: boolean;
  contextOnly?: boolean;
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
}

export interface CurateResult {
  contextPath: string;
  filesWritten: string[];
  agentUsed: boolean;
}
