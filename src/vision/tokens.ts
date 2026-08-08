import type { InjectionToken } from "tsyringe";
import type { ProviderSelection } from "../shared/application/models/ProviderSelection.js";
import type { IVisionService } from "./application/Services/vision.service.js";

export const VISION_TOKENS = {
  VisionService: "IVisionService" as InjectionToken<IVisionService>,
  VisionModelConfig: "VisionModelConfig" as InjectionToken<ProviderSelection>
} as const;

export { SHARED_TOKENS } from "../shared/tokens.js";
