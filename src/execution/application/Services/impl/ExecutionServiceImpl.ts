import { injectable, inject } from "tsyringe";
import { SHARED_TOKENS } from "../../../../shared/tokens.js";
import type { IProcessRunnerService } from "../../../../shared/application/Services/IProcessRunnerService.js";
import type { IExecutionService } from "../execution.service.js";
import type { ExecuteCodeInput } from "../../DTOs/execution.dto.js";
import type { ToolResult } from "../../../../shared/application/models/ToolResult.js";
import type { CommandResult } from "../../../domain/models/CommandResult.js";

@injectable()
export class ExecutionServiceImpl implements IExecutionService {
  constructor(@inject(SHARED_TOKENS.ProcessRunner) private readonly processRunner: IProcessRunnerService) {}

  async executeCode(input: ExecuteCodeInput): Promise<ToolResult<CommandResult>> {
    try {
      return await this.processRunner.run(input.command, input.args ?? [], {
        cwd: input.cwd,
        env: input.env,
        shell: input.shell,
        timeoutMs: input.timeoutMs
      });
    } catch (error) {
      return { error: true, message: error instanceof Error ? error.message : "Unknown execution error.", details: error };
    }
  }
}
