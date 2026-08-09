import { createMapper, createMap, type Mapper, namingConventions, SnakeCaseNamingConvention, CamelCaseNamingConvention } from "@automapper/core";
import { pojos } from "@automapper/pojos";
import type { StructuredError } from "../../shared/application/models/ToolResult.js";
import { registerWireMetadata } from "./wireMetadata.js";

export function isStructuredError(result: unknown): result is StructuredError {
  return (result as StructuredError | null)?.error === true;
}

export function mapWireInput<T>(mapper: Mapper, wire: Record<string, unknown>, from: string, to: string): T {
  return mapper.map(wire, from, to) as T;
}

const snakeToCamel = namingConventions({
  source: new SnakeCaseNamingConvention(),
  destination: new CamelCaseNamingConvention()
});

const camelToSnake = namingConventions({
  source: new CamelCaseNamingConvention(),
  destination: new SnakeCaseNamingConvention()
});

export function createWireMapper(): Mapper {
  const mapper = createMapper({ strategyInitializer: pojos() });
  registerWireMetadata(mapper);

  createMap(mapper, "ScreenshotWireArgs", "ScreenshotArgs", snakeToCamel);
  createMap(mapper, "BrowserNavigateWireArgs", "NavigateArgs", snakeToCamel);
  createMap(mapper, "BrowserSnapshotWireArgs", "SnapshotArgs", snakeToCamel);
  createMap(mapper, "BrowserClickWireArgs", "ClickArgs", snakeToCamel);
  createMap(mapper, "BrowserFillWireArgs", "FillArgs", snakeToCamel);
  createMap(mapper, "BrowserPressKeyWireArgs", "PressKeyArgs", snakeToCamel);
  createMap(mapper, "BrowserWaitForWireArgs", "WaitForArgs", snakeToCamel);
  createMap(mapper, "BrowserEvaluateWireArgs", "EvaluateArgs", snakeToCamel);
  createMap(mapper, "BrowserOpenInteractiveWireArgs", "OpenInteractiveArgs", snakeToCamel);
  createMap(mapper, "BrowserUseHeadlessWireArgs", "UseHeadlessArgs", snakeToCamel);
  createMap(mapper, "AnalyzeImageWireArgs", "AnalyzeImageInput", snakeToCamel);
  createMap(mapper, "CompareImagesWireArgs", "CompareImagesInput", snakeToCamel);
  createMap(mapper, "ExtractTextWireArgs", "ExtractTextInput", snakeToCamel);
  createMap(mapper, "ExtractMarkdownWireArgs", "ExtractMarkdownInput", snakeToCamel);
  createMap(mapper, "ExecuteCodeWireArgs", "ExecuteCodeInput", snakeToCamel);

  createMap(mapper, "ViewportWire", "Viewport", snakeToCamel);

  createMap(mapper, "ScreenshotResult", "ScreenshotWireResult", camelToSnake);
  createMap(mapper, "CommandResult", "CommandWireResult", camelToSnake);
  createMap(mapper, "VisionAnalysis", "VisionWireResult", camelToSnake);
  createMap(mapper, "VisionIssue", "IssueWire", camelToSnake);
  createMap(mapper, "ExtractedText", "ExtractTextWireResult", camelToSnake);
  createMap(mapper, "TextBlock", "TextBlockWire", camelToSnake);
  createMap(mapper, "ExtractedMarkdown", "ExtractMarkdownWireResult", camelToSnake);
  createMap(mapper, "PageSnapshot", "BrowserSnapshotWireResult", camelToSnake);
  createMap(mapper, "ElementInfo", "ElementInfoWire", camelToSnake);

  return mapper;
}
