import type { ToolResult } from "../../../shared/application/models/ToolResult.js";
import type { VisionAnalysis } from "../../domain/models/VisionModels.js";
import type { AnalyzeImageInput, CompareImagesInput } from "../DTOs/vision.dto.js";

export interface IVisionService {
  analyzeImage(input: AnalyzeImageInput): Promise<ToolResult<VisionAnalysis>>;
  compareImages(input: CompareImagesInput): Promise<ToolResult<VisionAnalysis>>;
}
