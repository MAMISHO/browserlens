export interface StructuredError {
  error: true;
  message: string;
  details?: unknown;
}

export type ToolResult<T> = T | StructuredError;
