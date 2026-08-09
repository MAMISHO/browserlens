import type { CommandResult } from "../../../execution/domain/models/CommandResult.js";

export interface IProcessRunnerService {
  run(command: string, args: string[], opts: { cwd?: string; env?: Record<string, string>; shell?: boolean; timeoutMs?: number }): Promise<CommandResult>;
}
