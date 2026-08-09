import type { InjectionToken } from "tsyringe";

export const SHARED_TOKENS = {
  ImageProcessor: "IImageProcessorService" as InjectionToken<import("./application/Services/IImageProcessorService.js").IImageProcessorService>,
  ScreenshotStorage: "IScreenshotStorage" as InjectionToken<import("./application/Repositories/IScreenshotStorage.js").IScreenshotStorage>,
  ModelClient: "IModelClientService" as InjectionToken<import("./application/Services/IModelClientService.js").IModelClientService>,
  ProcessRunner: "IProcessRunnerService" as InjectionToken<import("./application/Services/IProcessRunnerService.js").IProcessRunnerService>,
} as const;
