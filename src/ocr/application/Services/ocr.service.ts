import type { ToolResult } from "../../../shared/application/models/ToolResult.js";
import type { ExtractedMarkdown, ExtractedText } from "../../domain/models/OcrModels.js";
import type { ExtractMarkdownInput, ExtractTextInput } from "../DTOs/ocr.dto.js";

export interface IOcrService {
  extractText(input: ExtractTextInput): Promise<ToolResult<ExtractedText>>;
  extractMarkdown(input: ExtractMarkdownInput): Promise<ToolResult<ExtractedMarkdown>>;
}
