import { inject, injectable } from "tsyringe";
import { z } from "zod";
import { SHARED_TOKENS } from "../../../../shared/tokens.js";
import { OCR_TOKENS } from "../../../tokens.js";
import type { IImageProcessorService } from "../../../../shared/application/Services/IImageProcessorService.js";
import type { ProviderSelection } from "../../../../shared/application/models/ProviderSelection.js";
import type { ToolResult } from "../../../../shared/application/models/ToolResult.js";
import type { ExtractedMarkdown, ExtractedText } from "../../../domain/models/OcrModels.js";
import type { ExtractMarkdownInput, ExtractTextInput } from "../../DTOs/ocr.dto.js";
import type { IOcrService } from "../ocr.service.js";

const ocrSchema = z.object({
  text: z.string(),
  blocks: z.array(
    z.object({
      text: z.string(),
      role: z.string().optional()
    })
  )
});

@injectable()
export class OcrServiceImpl implements IOcrService {
  constructor(
    @inject(OCR_TOKENS.OcrModelConfig) private readonly config: ProviderSelection,
    @inject(SHARED_TOKENS.ImageProcessor) private readonly imageProcessor: IImageProcessorService
  ) {}

  async extractText(input: ExtractTextInput): Promise<ToolResult<ExtractedText>> {
    try {
      const image = await this.imageProcessor.imageToOptimizedBase64(input.imagePath);
      const { content } = await this.config.client.generate({
        model: this.config.model,
        images: [image],
        format: this.config.provider === "ollama" ? "json" : undefined,
        options: { temperature: 0 },
        prompt: `Extract all visible text from the attached image.

Return ONLY valid JSON with this schema:
{
  "text": "all visible text in natural reading order",
  "blocks": [
    {
      "text": "one visible text block",
      "role": "optional short label such as heading, button, input, paragraph, nav, table, code, error"
    }
  ]
}

Do not include markdown, code fences, commentary, or extra keys. Preserve punctuation and line breaks where useful.`
      });

      try {
        return ocrSchema.parse(JSON.parse(extractJsonObject(content)));
      } catch {
        return {
          text: content.trim(),
          blocks: content.trim() ? [{ text: content.trim() }] : []
        };
      }
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown OCR error.",
        details: error
      };
    }
  }

  async extractMarkdown(input: ExtractMarkdownInput): Promise<ToolResult<ExtractedMarkdown>> {
    try {
      const image = await this.imageProcessor.imageToOptimizedBase64(input.imagePath);
      const { content } = await this.config.client.generate({
        model: this.config.model,
        images: [image],
        options: { temperature: 0 },
        prompt: `Extract the readable content from the attached image as clean Markdown.

Preserve headings, paragraphs, lists, tables, code blocks, labels, and meaningful line breaks.
Do not invent content that is not visible.
Do not wrap the result in a code fence.
${input.instructions ? `Additional instructions: ${input.instructions}` : ""}`
      });

      return { markdown: stripMarkdownFence(content.trim()) };
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown OCR markdown error.",
        details: error
      };
    }
  }
}

function extractJsonObject(response: string): string {
  const trimmed = response.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function stripMarkdownFence(response: string): string {
  const trimmed = response.trim();
  if (!trimmed.startsWith("```")) return trimmed;

  const lines = trimmed.split(/\r?\n/);
  if (lines.length >= 2 && lines[lines.length - 1].trim() === "```") {
    return lines.slice(1, -1).join("\n").trim();
  }
  return trimmed;
}
