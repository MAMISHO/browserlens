export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface IProcessRunner {
  run(command: string, args: string[], options?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<CommandResult>;
}
