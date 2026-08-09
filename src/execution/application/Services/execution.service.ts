import type { ToolResult } from "../../../shared/application/models/ToolResult.js";
import type { CommandResult } from "../../domain/models/CommandResult.js";
import type { ExecuteCodeInput } from "../DTOs/execution.dto.js";

export interface IExecutionService {
  executeCode(input: ExecuteCodeInput): Promise<ToolResult<CommandResult>>;
}
