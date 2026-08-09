import type { Mapper } from "@automapper/core";
import type { ToolResult } from "../../shared/application/models/ToolResult.js";
import type { CommandResult } from "../../execution/domain/models/CommandResult.js";
import type { CommandWireResult } from "./wireMetadata.js";
import { isStructuredError } from "./wireMapper.js";

export function mapCommandResult(mapper: Mapper, result: ToolResult<CommandResult>): Record<string, unknown> {
  if (isStructuredError(result)) return result as unknown as Record<string, unknown>;
  return mapper.map(result, "CommandResult", "CommandWireResult") as CommandWireResult;
}
