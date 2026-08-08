import type { InjectionToken } from "tsyringe";

export const SHARED_TOKENS = {
  ImageProcessor: "IImageProcessor" as InjectionToken<import("./application/Repositories/IImageProcessor.js").IImageProcessor>,
  ScreenshotStorage: "IScreenshotStorage" as InjectionToken<import("./application/Repositories/IScreenshotStorage.js").IScreenshotStorage>,
  ModelClient: "IModelClient" as InjectionToken<import("./application/Repositories/IModelClient.js").IModelClient>,
  ProcessRunner: "IProcessRunner" as InjectionToken<import("./application/Repositories/IProcessRunner.js").IProcessRunner>,
} as const;
