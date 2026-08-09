import { z } from "zod";
import type { VisionAnalysis } from "../../domain/models/VisionModels.js";

const visionSchema = z
  .object({
    matches_expectations: z.boolean(),
    confidence: z.number().min(0).max(1),
    issues: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        severity: z.enum(["low", "medium", "high"])
      })
    )
  })
  .transform(
    (data): VisionAnalysis => ({
      matchesExpectations: data.matches_expectations,
      confidence: data.confidence,
      issues: data.issues.map((issue) => ({
        type: issue.type,
        description: issue.description,
        severity: issue.severity
      }))
    })
  );

export function parseVisionResponse(response: string):
  | { success: true; data: VisionAnalysis }
  | { success: false; error: unknown } {
  try {
    const json = extractJsonObject(response);
    return { success: true, data: visionSchema.parse(JSON.parse(json)) };
  } catch (error) {
    return { success: false, error };
  }
}

function extractJsonObject(response: string): string {
  const trimmed = response.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}
