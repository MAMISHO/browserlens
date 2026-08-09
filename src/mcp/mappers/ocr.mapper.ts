import type { Mapper } from "@automapper/core";
import type { ToolResult } from "../../shared/application/models/ToolResult.js";
import type { ExtractedMarkdown, ExtractedText } from "../../ocr/domain/models/OcrModels.js";
import type { ExtractMarkdownWireResult, ExtractTextWireResult } from "./wireMetadata.js";
import { isStructuredError } from "./wireMapper.js";

export function mapExtractTextResult(mapper: Mapper, result: ToolResult<ExtractedText>): Record<string, unknown> {
  if (isStructuredError(result)) return result as unknown as Record<string, unknown>;
  return mapper.map(result, "ExtractedText", "ExtractTextWireResult") as ExtractTextWireResult;
}

export function mapExtractMarkdownResult(mapper: Mapper, result: ToolResult<ExtractedMarkdown>): Record<string, unknown> {
  if (isStructuredError(result)) return result as unknown as Record<string, unknown>;
  return mapper.map(result, "ExtractedMarkdown", "ExtractMarkdownWireResult") as ExtractMarkdownWireResult;
}
