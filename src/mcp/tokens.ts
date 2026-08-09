import type { InjectionToken } from "tsyringe";
import type { Mapper } from "@automapper/core";

export const MCP_TOKENS = {
  Mapper: "Mapper" as InjectionToken<Mapper>,
  McpController: "McpController" as InjectionToken<import("./controller.js").McpController>
} as const;
