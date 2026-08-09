import { spawn } from "node:child_process";
import type { IProcessRunnerService } from "../../shared/application/Services/IProcessRunnerService.js";
import type { CommandResult } from "../domain/models/CommandResult.js";

export class ProcessRunner implements IProcessRunnerService {
  async run(command: string, args: string[], opts: { cwd?: string; env?: Record<string, string>; shell?: boolean; timeoutMs?: number }): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args ?? [], {
        cwd: opts.cwd ?? process.cwd(),
        env: { ...process.env, ...opts.env },
        shell: opts.shell ?? !args.length
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, opts.timeoutMs ?? 60_000);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve({ exitCode: code, stdout, stderr, timedOut });
      });
    });
  }
}
