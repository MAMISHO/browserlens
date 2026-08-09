export type Severity = "low" | "medium" | "high";

export interface VisionIssue {
  type: string;
  description: string;
  severity: Severity;
}

export interface VisionAnalysis {
  matchesExpectations: boolean;
  confidence: number;
  issues: VisionIssue[];
}
