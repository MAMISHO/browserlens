import "reflect-metadata";
import { container as tsyringeContainer, Lifecycle } from "tsyringe";
import { SHARED_TOKENS } from "./shared/tokens.js";
import { BROWSER_TOKENS } from "./browser/tokens.js";
import { VISION_TOKENS } from "./vision/tokens.js";
import { OCR_TOKENS } from "./ocr/tokens.js";
import { EXECUTION_TOKENS } from "./execution/tokens.js";
import { MCP_TOKENS } from "./mcp/tokens.js";
import { ImageProcessor } from "./shared/infra/ImageProcessor.js";
import { ScreenshotStorage } from "./shared/infra/ScreenshotStorage.js";
import { ProcessRunner } from "./execution/infra/ProcessRunner.js";
import { OllamaClientImpl } from "./vision/infra/OllamaClientImpl.js";
import { createVisionProvider, createOcrProvider } from "./shared/infra/providerConfig.js";
import { BrowserDriver } from "./browser/infra/BrowserDriver.js";
import { BrowserServiceImpl } from "./browser/application/Services/impl/BrowserServiceImpl.js";
import { VisionServiceImpl } from "./vision/application/Services/impl/VisionServiceImpl.js";
import { OcrServiceImpl } from "./ocr/application/Services/impl/OcrServiceImpl.js";
import { ExecutionServiceImpl } from "./execution/application/Services/impl/ExecutionServiceImpl.js";
import { createWireMapper } from "./mcp/mappers/wireMapper.js";
import { McpController } from "./mcp/controller.js";

export const container = tsyringeContainer;

container.register(SHARED_TOKENS.ImageProcessor, { useClass: ImageProcessor });
container.register(SHARED_TOKENS.ScreenshotStorage, { useClass: ScreenshotStorage });
container.register(SHARED_TOKENS.ProcessRunner, { useClass: ProcessRunner });
container.register(SHARED_TOKENS.ModelClient, { useClass: OllamaClientImpl }, { lifecycle: Lifecycle.Singleton });
container.register(VISION_TOKENS.VisionModelConfig, {
  useFactory: (c) => createVisionProvider(c.resolve(SHARED_TOKENS.ModelClient))
});
container.register(OCR_TOKENS.OcrModelConfig, {
  useFactory: (c) => createOcrProvider(c.resolve(SHARED_TOKENS.ModelClient))
});
container.register(BROWSER_TOKENS.BrowserDriver, { useClass: BrowserDriver }, { lifecycle: Lifecycle.Singleton });
container.register(BROWSER_TOKENS.BrowserService, { useClass: BrowserServiceImpl });
container.register(VISION_TOKENS.VisionService, { useClass: VisionServiceImpl });
container.register(OCR_TOKENS.OcrService, { useClass: OcrServiceImpl });
container.register(EXECUTION_TOKENS.ExecutionService, { useClass: ExecutionServiceImpl });
container.register(MCP_TOKENS.Mapper, {
  useFactory: (() => {
    let mapper: ReturnType<typeof createWireMapper> | undefined;
    return () => (mapper ??= createWireMapper());
  })()
});
container.register(MCP_TOKENS.McpController, { useClass: McpController });
