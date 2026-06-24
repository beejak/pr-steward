declare module "@cursor/sdk" {
  export const Agent: {
    prompt(
      text: string,
      options: {
        apiKey: string;
        model: { id: string };
        cloud?: { repos: string[] };
      },
    ): Promise<{ status: string; result?: string }>;
  };
}
