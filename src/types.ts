export type Severity = "low" | "medium" | "high";

export interface VisionIssue {
  type: string;
  description: string;
  severity: Severity;
}

export interface VisionAnalysis {
  matches_expectations: boolean;
  confidence: number;
  issues: VisionIssue[];
}

export interface StructuredError {
  error: true;
  message: string;
  details?: unknown;
}

export type ToolResult<T> = T | StructuredError;
