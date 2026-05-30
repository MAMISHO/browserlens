import { z } from "zod";
import { imageToOptimizedBase64 } from "./imageUtils.js";
import { OllamaClient } from "./ollamaClient.js";
import type { ToolResult } from "./types.js";

const ocrSchema = z.object({
  text: z.string(),
  blocks: z.array(
    z.object({
      text: z.string(),
      role: z.string().optional()
    })
  )
});

export interface ExtractTextInput {
  image_path: string;
}

export interface ExtractTextOutput {
  text: string;
  blocks: Array<{ text: string; role?: string }>;
}

export class OcrService {
  constructor(
    private readonly ollama: OllamaClient,
    private readonly model = process.env.OCR_MODEL ?? "deepseek-ocr"
  ) {}

  async extractText(input: ExtractTextInput): Promise<ToolResult<ExtractTextOutput>> {
    try {
      const image = await imageToOptimizedBase64(input.image_path);
      const response = await this.ollama.generate({
        model: this.model,
        images: [image],
        format: "json",
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
        return ocrSchema.parse(JSON.parse(extractJsonObject(response)));
      } catch {
        return {
          text: response.trim(),
          blocks: response.trim() ? [{ text: response.trim() }] : []
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
