import type { PullRequest } from "../../types.js";
import type { PlatformClient } from "../client.js";
import { normalizeGitHubPull, type GitHubPullRaw } from "./normalize.js";

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

  async listOpenPullRequests(): Promise<PullRequest[]> {
    const pulls = await this.api<GitHubPullRaw[]>(
      "/pulls?state=open&per_page=100",
    );
    const repo = `${this.options.owner}/${this.options.repo}`;
    return pulls.map((p) => normalizeGitHubPull(p, repo));
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
