import { inject, injectable } from "tsyringe";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Mapper } from "@automapper/core";
import { BROWSER_TOKENS } from "../browser/tokens.js";
import { VISION_TOKENS } from "../vision/tokens.js";
import { OCR_TOKENS } from "../ocr/tokens.js";
import { EXECUTION_TOKENS } from "../execution/tokens.js";
import { MCP_TOKENS } from "./tokens.js";
import { TOOL_DEFINITIONS } from "./toolDefinitions.js";
import { json } from "./formatter.js";
import {
  executeSchema,
  screenshotSchema,
  browserNavigateSchema,
  browserSnapshotSchema,
  browserClickSchema,
  browserFillSchema,
  browserPressKeySchema,
  browserWaitForSchema,
  browserEvaluateSchema,
  browserOpenInteractiveSchema,
  browserUseHeadlessSchema,
  analyzeSchema,
  compareImagesSchema,
  extractTextSchema,
  extractMarkdownSchema
} from "./schemas.js";
import {
  mapWireInput,
  mapScreenshotResult,
  mapSnapshotResult,
  mapNavigateResult,
  mapClickResult,
  mapFillResult,
  mapPressKeyResult,
  mapWaitForResult,
  mapEvaluateResult,
  mapOpenInteractiveResult,
  mapUseHeadlessResult,
  mapVisionAnalysisResult,
  mapExtractTextResult,
  mapExtractMarkdownResult,
  mapCommandResult
} from "./mappers/index.js";
import type { IBrowserService } from "../browser/application/Services/browser.service.js";
import type { IVisionService } from "../vision/application/Services/vision.service.js";
import type { IOcrService } from "../ocr/application/Services/ocr.service.js";
import type { IExecutionService } from "../execution/application/Services/execution.service.js";
import type {
  ScreenshotArgs,
  NavigateArgs,
  SnapshotArgs,
  ClickArgs,
  FillArgs,
  PressKeyArgs,
  WaitForArgs,
  EvaluateArgs,
  OpenInteractiveArgs,
  UseHeadlessArgs
} from "../browser/application/DTOs/browser.dto.js";
import type { AnalyzeImageInput, CompareImagesInput } from "../vision/application/DTOs/vision.dto.js";
import type { ExtractTextInput, ExtractMarkdownInput } from "../ocr/application/DTOs/ocr.dto.js";
import type { ExecuteCodeInput } from "../execution/application/DTOs/execution.dto.js";

@injectable()
export class McpController {
  constructor(
    @inject(BROWSER_TOKENS.BrowserService) private readonly browser: IBrowserService,
    @inject(VISION_TOKENS.VisionService) private readonly vision: IVisionService,
    @inject(OCR_TOKENS.OcrService) private readonly ocr: IOcrService,
    @inject(EXECUTION_TOKENS.ExecutionService) private readonly execution: IExecutionService,
    @inject(MCP_TOKENS.Mapper) private readonly mapper: Mapper
  ) {}

  listTools() {
    return { tools: TOOL_DEFINITIONS };
  }

  async callTool(name: string, args: unknown): Promise<CallToolResult> {
    try {
      switch (name) {
        case "execute_code": {
          const parsed = executeSchema.parse(args);
          const dto = mapWireInput<ExecuteCodeInput>(this.mapper, parsed, "ExecuteCodeWireArgs", "ExecuteCodeInput");
          return json(mapCommandResult(this.mapper, await this.execution.executeCode(dto)));
        }
        case "browser_navigate": {
          const parsed = browserNavigateSchema.parse(args);
          const dto = mapWireInput<NavigateArgs>(this.mapper, parsed, "BrowserNavigateWireArgs", "NavigateArgs");
          return json(mapNavigateResult(this.mapper, await this.browser.navigate(dto)));
        }
        case "browser_snapshot": {
          const parsed = browserSnapshotSchema.parse(args);
          const dto = mapWireInput<SnapshotArgs>(this.mapper, parsed, "BrowserSnapshotWireArgs", "SnapshotArgs");
          return json(mapSnapshotResult(this.mapper, await this.browser.snapshot(dto)));
        }
        case "browser_click": {
          const parsed = browserClickSchema.parse(args);
          const dto = mapWireInput<ClickArgs>(this.mapper, parsed, "BrowserClickWireArgs", "ClickArgs");
          return json(mapClickResult(this.mapper, await this.browser.click(dto)));
        }
        case "browser_fill": {
          const parsed = browserFillSchema.parse(args);
          const dto = mapWireInput<FillArgs>(this.mapper, parsed, "BrowserFillWireArgs", "FillArgs");
          return json(mapFillResult(this.mapper, await this.browser.fill(dto)));
        }
        case "browser_press_key": {
          const parsed = browserPressKeySchema.parse(args);
          const dto = mapWireInput<PressKeyArgs>(this.mapper, parsed, "BrowserPressKeyWireArgs", "PressKeyArgs");
          return json(mapPressKeyResult(this.mapper, await this.browser.pressKey(dto)));
        }
        case "browser_wait_for": {
          const parsed = browserWaitForSchema.parse(args);
          const dto = mapWireInput<WaitForArgs>(this.mapper, parsed, "BrowserWaitForWireArgs", "WaitForArgs");
          return json(mapWaitForResult(this.mapper, await this.browser.waitFor(dto)));
        }
        case "browser_evaluate": {
          const parsed = browserEvaluateSchema.parse(args);
          const dto = mapWireInput<EvaluateArgs>(this.mapper, parsed, "BrowserEvaluateWireArgs", "EvaluateArgs");
          return json(mapEvaluateResult(this.mapper, await this.browser.evaluate(dto)));
        }
        case "browser_open_interactive": {
          const parsed = browserOpenInteractiveSchema.parse(args);
          const dto = mapWireInput<OpenInteractiveArgs>(this.mapper, parsed, "BrowserOpenInteractiveWireArgs", "OpenInteractiveArgs");
          return json(mapOpenInteractiveResult(this.mapper, await this.browser.openInteractive(dto)));
        }
        case "browser_use_headless": {
          const parsed = browserUseHeadlessSchema.parse(args);
          const dto = mapWireInput<UseHeadlessArgs>(this.mapper, parsed, "BrowserUseHeadlessWireArgs", "UseHeadlessArgs");
          return json(mapUseHeadlessResult(this.mapper, await this.browser.useHeadless(dto)));
        }
        case "capture_screenshot": {
          const parsed = screenshotSchema.parse(args);
          const dto = mapWireInput<ScreenshotArgs>(this.mapper, parsed, "ScreenshotWireArgs", "ScreenshotArgs");
          return json(mapScreenshotResult(this.mapper, await this.browser.captureScreenshot(dto)));
        }
        case "analyze_image": {
          const parsed = analyzeSchema.parse(args);
          const dto = mapWireInput<AnalyzeImageInput>(this.mapper, parsed, "AnalyzeImageWireArgs", "AnalyzeImageInput");
          return json(mapVisionAnalysisResult(this.mapper, await this.vision.analyzeImage(dto)));
        }
        case "compare_images": {
          const parsed = compareImagesSchema.parse(args);
          const dto = mapWireInput<CompareImagesInput>(this.mapper, parsed, "CompareImagesWireArgs", "CompareImagesInput");
          return json(mapVisionAnalysisResult(this.mapper, await this.vision.compareImages(dto)));
        }
        case "extract_text": {
          const parsed = extractTextSchema.parse(args);
          const dto = mapWireInput<ExtractTextInput>(this.mapper, parsed, "ExtractTextWireArgs", "ExtractTextInput");
          return json(mapExtractTextResult(this.mapper, await this.ocr.extractText(dto)));
        }
        case "extract_markdown": {
          const parsed = extractMarkdownSchema.parse(args);
          const dto = mapWireInput<ExtractMarkdownInput>(this.mapper, parsed, "ExtractMarkdownWireArgs", "ExtractMarkdownInput");
          return json(mapExtractMarkdownResult(this.mapper, await this.ocr.extractMarkdown(dto)));
        }
        default:
          return json({ error: true, message: `Unknown tool: ${name}` }, true);
      }
    } catch (error) {
      return json({ error: true, message: error instanceof Error ? error.message : "Unknown MCP tool error.", details: error }, true);
    }
  }
}
