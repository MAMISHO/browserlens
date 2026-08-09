import type { InjectionToken } from "tsyringe";

export const EXECUTION_TOKENS = {
  ExecutionService: "IExecutionService" as InjectionToken<import("./application/Services/execution.service.js").IExecutionService>
} as const;
