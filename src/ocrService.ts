import { z } from "zod";
import { imageToOptimizedBase64 } from "./imageUtils.js";
import { OllamaClient } from "./ollamaClient.js";
import type { ModelClient } from "./modelClient.js";
import { createOcrProvider } from "./providerConfig.js";
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

export interface ExtractMarkdownInput {
  image_path: string;
  instructions?: string;
}

export interface ExtractMarkdownOutput {
  markdown: string;
}

export class OcrService {
  private readonly client: ModelClient;
  private readonly model: string;
  private readonly provider: string;

  constructor(
    private readonly ollama: OllamaClient,
    provider = createOcrProvider(ollama)
  ) {
    this.client = provider.client;
    this.model = provider.model;
    this.provider = provider.provider;
  }

  async extractText(input: ExtractTextInput): Promise<ToolResult<ExtractTextOutput>> {
    try {
      const image = await imageToOptimizedBase64(input.image_path);
      const response = await this.client.generate({
        model: this.model,
        images: [image],
        format: this.provider === "ollama" ? "json" : undefined,
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

  async extractMarkdown(input: ExtractMarkdownInput): Promise<ToolResult<ExtractMarkdownOutput>> {
    try {
      const image = await imageToOptimizedBase64(input.image_path);
      const response = await this.client.generate({
        model: this.model,
        images: [image],
        options: { temperature: 0 },
        prompt: `Extract the readable content from the attached image as clean Markdown.

Preserve headings, paragraphs, lists, tables, code blocks, labels, and meaningful line breaks.
Do not invent content that is not visible.
Do not wrap the result in a code fence.
${input.instructions ? `Additional instructions: ${input.instructions}` : ""}`
      });

      return { markdown: stripMarkdownFence(response.trim()) };
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
