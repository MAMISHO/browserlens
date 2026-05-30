import { spawn } from "node:child_process";
import type { ToolResult } from "./types.js";

export interface ExecuteCodeInput {
  command: string;
  args?: string[];
  cwd?: string;
  timeout_ms?: number;
  env?: Record<string, string>;
  shell?: boolean;
}

export interface ExecuteCodeOutput {
  exit_code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
}

export class ExecuteService {
  async execute(input: ExecuteCodeInput): Promise<ToolResult<ExecuteCodeOutput>> {
    return new Promise((resolve) => {
      const child = spawn(input.command, input.args ?? [], {
        cwd: input.cwd ?? process.cwd(),
        env: { ...process.env, ...input.env },
        shell: input.shell ?? !input.args?.length
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, input.timeout_ms ?? 60_000);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        resolve({ error: true, message: error.message, details: error });
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve({ exit_code: code, stdout, stderr, timed_out: timedOut });
      });
    });
  }
}
