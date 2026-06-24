import type { PullRequest } from "../types.js";

export interface PlatformClient {
  listOpenPullRequests(): Promise<PullRequest[]>;
  closePullRequest(number: number, comment: string): Promise<void>;
  addLabel(number: number, label: string): Promise<void>;
  addComment(number: number, body: string): Promise<void>;
}

export interface RecordedCall {
  method: string;
  args: unknown[];
}

export class MockPlatformClient implements PlatformClient {
  readonly calls: RecordedCall[] = [];
  constructor(public pullRequests: PullRequest[] = []) {}

  async listOpenPullRequests(): Promise<PullRequest[]> {
    this.calls.push({ method: "listOpenPullRequests", args: [] });
    return this.pullRequests;
  }

  async closePullRequest(number: number, comment: string): Promise<void> {
    this.calls.push({ method: "closePullRequest", args: [number, comment] });
  }

  async addLabel(number: number, label: string): Promise<void> {
    this.calls.push({ method: "addLabel", args: [number, label] });
  }

  async addComment(number: number, body: string): Promise<void> {
    this.calls.push({ method: "addComment", args: [number, body] });
  }
}
