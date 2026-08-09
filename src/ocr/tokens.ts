import type { InjectionToken } from "tsyringe";
import type { ProviderSelection } from "../shared/application/models/ProviderSelection.js";
import type { IOcrService } from "./application/Services/ocr.service.js";

export const OCR_TOKENS = {
  OcrService: "IOcrService" as InjectionToken<IOcrService>,
  OcrModelConfig: "OcrModelConfig" as InjectionToken<ProviderSelection>
} as const;

export { SHARED_TOKENS } from "../shared/tokens.js";
