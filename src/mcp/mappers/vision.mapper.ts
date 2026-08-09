import type { Mapper } from "@automapper/core";
import type { ToolResult } from "../../shared/application/models/ToolResult.js";
import type { VisionAnalysis } from "../../vision/domain/models/VisionModels.js";
import type { VisionWireResult } from "./wireMetadata.js";
import { isStructuredError } from "./wireMapper.js";

export function mapVisionAnalysisResult(mapper: Mapper, result: ToolResult<VisionAnalysis>): Record<string, unknown> {
  if (isStructuredError(result)) return result as unknown as Record<string, unknown>;
  return mapper.map(result, "VisionAnalysis", "VisionWireResult") as VisionWireResult;
}
