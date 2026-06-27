import type { MergedPullRequest, PullRequest } from "../../types.js";
import type { PlatformClient } from "../client.js";
import {
  normalizeGitHubPull,
  type GitHubPullFile,
  type GitHubPullRaw,
} from "./normalize.js";

export interface GitHubClientOptions {
  owner: string;
  repo: string;
  token: string;
  fetchFn?: typeof fetch;
}

export class GitHubClient implements PlatformClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: GitHubClientOptions) {
    this.baseUrl = `https://api.github.com/repos/${options.owner}/${options.repo}`;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.options.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API ${path} failed: ${res.status} ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private async pullFiles(number: number): Promise<string[]> {
    const files = await this.api<GitHubPullFile[]>(`/pulls/${number}/files?per_page=100`);
    return files.map((f) => f.filename);
  }

  private async enrichPull(raw: GitHubPullRaw, repo: string): Promise<PullRequest> {
    const base = normalizeGitHubPull(raw, repo);
    try {
      const changedFiles = await this.pullFiles(raw.number);
      return { ...base, changedFiles };
    } catch {
      return base;
    }
  }

  async listOpenPullRequests(): Promise<PullRequest[]> {
    const pulls = await this.api<GitHubPullRaw[]>(
      "/pulls?state=open&per_page=100",
    );
    const repo = `${this.options.owner}/${this.options.repo}`;
    return Promise.all(pulls.map((p) => this.enrichPull(p, repo)));
  }

  async listReopenedAfterSteward(): Promise<number[]> {
    interface LabeledIssue {
      number: number;
      pull_request?: unknown;
    }

    const issues = await this.api<LabeledIssue[]>(
      "/issues?labels=pr-steward:auto-closed&state=open&per_page=100",
    );
    return issues.filter((i) => i.pull_request).map((i) => i.number);
  }

  async listRecentlyMergedPullRequests(sinceDays = 90): Promise<MergedPullRequest[]> {
    const pulls = await this.api<GitHubPullRaw[]>(
      "/pulls?state=closed&sort=updated&direction=desc&per_page=50",
    );
    const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
    const merged = pulls.filter((p) => p.merged_at && new Date(p.merged_at).getTime() >= cutoff);

    const results: MergedPullRequest[] = [];
    for (const pull of merged) {
      try {
        const files = await this.pullFiles(pull.number);
        results.push({
          number: pull.number,
          mergedAt: new Date(pull.merged_at!),
          files,
        });
      } catch {
        // skip PRs we cannot read
      }
    }
    return results;
  }

  async closePullRequest(number: number, comment: string): Promise<void> {
    await this.addComment(number, comment);
    await this.api(`/pulls/${number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed" }),
    });
  }

  async addLabel(number: number, label: string): Promise<void> {
    await this.api(`/issues/${number}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels: [label] }),
    });
  }

  async addComment(number: number, body: string): Promise<void> {
    await this.api(`/issues/${number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }
}
