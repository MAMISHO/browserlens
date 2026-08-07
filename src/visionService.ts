import { z } from "zod";
import { comparisonContactSheetBase64, imageToOptimizedBase64 } from "./imageUtils.js";
import { OllamaClient } from "./ollamaClient.js";
import { createVisionProvider } from "./providerConfig.js";
import type { ModelClient } from "./modelClient.js";
import type { ToolResult, VisionAnalysis } from "./types.js";

const visionSchema = z.object({
  matches_expectations: z.boolean(),
  confidence: z.number().min(0).max(1),
  issues: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      severity: z.enum(["low", "medium", "high"])
    })
  )
});

export interface AnalyzeImageInput {
  goal: string;
  expectations?: string[];
  image_path: string;
}

export interface CompareImagesInput {
  goal: string;
  expectations?: string[];
  reference_image_path: string;
  candidate_image_path: string;
}

export class VisionService {
  private readonly client: ModelClient;
  private readonly model: string;
  private readonly provider: string;

  constructor(
    private readonly ollama: OllamaClient,
    provider = createVisionProvider(ollama)
  ) {
    this.client = provider.client;
    this.model = provider.model;
    this.provider = provider.provider;
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<ToolResult<VisionAnalysis>> {
    try {
      const image = await imageToOptimizedBase64(input.image_path);
      const prompt = this.buildPrompt(input, false);
      const first = await this.client.generate({
        model: this.model,
        prompt,
        images: [image],
        format: this.provider === "ollama" ? "json" : undefined,
        options: { temperature: 0, num_predict: 700, maxTokens: 700 }
      });

      const parsed = this.parseVisionResponse(first);
      if (parsed.success) return parsed.data;

      const firstFallback = this.fallbackFromUnstructuredResponse(first, false);
      if (firstFallback) return firstFallback;

      const retry = await this.client.generate({
        model: this.model,
        prompt: this.buildPrompt(input, true, first),
        images: [image],
        format: this.provider === "ollama" ? "json" : undefined,
        options: { temperature: 0, num_predict: 700, maxTokens: 700 }
      });

      const retryParsed = this.parseVisionResponse(retry);
      if (retryParsed.success) return retryParsed.data;

      const fallback = this.fallbackFromUnstructuredResponse(retry || first, false);
      if (fallback) return fallback;

      return {
        error: true,
        message: "Vision model returned malformed JSON after retry.",
        details: { firstResponse: first, retryResponse: retry, parseError: retryParsed.error }
      };
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown vision analysis error.",
        details: error
      };
    }
  }

  async compareImages(input: CompareImagesInput): Promise<ToolResult<VisionAnalysis>> {
    try {
      const comparisonImage = await comparisonContactSheetBase64(
        input.reference_image_path,
        input.candidate_image_path
      );
      const prompt = this.buildComparePrompt(input, false);
      const first = await this.client.generate({
        model: this.model,
        prompt,
        images: [comparisonImage],
        format: this.provider === "ollama" ? "json" : undefined,
        options: { temperature: 0, num_predict: 700, maxTokens: 700 }
      });

      const parsed = this.parseVisionResponse(first);
      if (parsed.success) return parsed.data;

      const firstFallback = this.fallbackFromUnstructuredResponse(first, true);
      if (firstFallback) return firstFallback;

      const retry = await this.client.generate({
        model: this.model,
        prompt: this.buildComparePrompt(input, true, first),
        images: [comparisonImage],
        format: this.provider === "ollama" ? "json" : undefined,
        options: { temperature: 0, num_predict: 700, maxTokens: 700 }
      });

      const retryParsed = this.parseVisionResponse(retry);
      if (retryParsed.success) return retryParsed.data;

      const fallback = this.fallbackFromUnstructuredResponse(retry || first, true);
      if (fallback) return fallback;

      return {
        error: true,
        message: "Vision model returned malformed JSON after retry.",
        details: { firstResponse: first, retryResponse: retry, parseError: retryParsed.error }
      };
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown image comparison error.",
        details: error
      };
    }
  }

  private buildPrompt(input: AnalyzeImageInput, retry: boolean, previousResponse?: string): string {
    const expectations = this.formatExpectations(input.expectations, [
      "Describe visible layout, content, text, alignment, spacing, color, imagery, clipping, overlap, and rendering defects.",
      "Return issues that a text-only caller can act on without seeing the image."
    ]);
    const retryText = retry
      ? `\nPrevious response was invalid and must be corrected. Previous response:\n${previousResponse ?? ""}\n`
      : "";

    return `You are a visual validation tool. Analyze the attached image for the external caller.

Goal:
${input.goal}

Expectations:
${expectations}
${retryText}
Return ONLY valid JSON. Do not include markdown, commentary, code fences, natural language, or extra keys.

JSON schema:
{
  "matches_expectations": boolean,
  "confidence": number between 0 and 1,
  "issues": [
    {
      "type": string,
      "description": string,
      "severity": "low" | "medium" | "high"
    }
  ]
}

Decision rules:
- Set "matches_expectations" to true only when the visible image satisfies the goal and all expectations.
- Use "issues" for visual mismatches, missing UI elements, layout problems, unreadable text, broken rendering, or uncertainty that affects validation.
- If there are no issues, return an empty issues array.
- Confidence must reflect visual certainty, not task importance.`;
  }

  private buildComparePrompt(input: CompareImagesInput, retry: boolean, previousResponse?: string): string {
    const expectations = this.formatExpectations(input.expectations, [
      "The candidate should visually match the reference composition, layout, spacing, alignment, typography, colors, imagery, and visible text.",
      "Report visual differences that are not obvious from DOM/text alone.",
      "Prioritize differences in the rendered canvas or viewport over similarities in underlying markup."
    ]);
    const retryText = retry
      ? `\nPrevious response was invalid and must be corrected. Previous response:\n${previousResponse ?? ""}\n`
      : "";

    return `You are a visual comparison tool. Compare the two panels in the attached image for the external caller.

Panel layout:
- LEFT panel labeled REFERENCE: the visual target that should be matched.
- RIGHT panel labeled CANDIDATE: the implementation being evaluated.

Goal:
${input.goal}

Expectations:
${expectations}
${retryText}
Return ONLY valid JSON. Do not include markdown, commentary, code fences, natural language, or extra keys.

JSON schema:
{
  "matches_expectations": boolean,
  "confidence": number between 0 and 1,
  "issues": [
    {
      "type": string,
      "description": string,
      "severity": "low" | "medium" | "high"
    }
  ]
}

Decision rules:
- Set "matches_expectations" to true only when the candidate visually matches the reference for the stated goal and expectations.
- Focus on user-visible differences: layout, spacing, alignment, typography, colors, imagery, missing elements, extra elements, clipping, overlap, unreadable text, and rendering defects.
- Describe each issue in terms of how the candidate differs from the reference.
- Do not claim that people, objects, or photos are different identities unless the difference is visually unambiguous. If an image may be the same asset shown with a different crop, scale, placement, or visible region, describe it as a crop/scale/position difference instead.
- Prefer concrete visual facts over guesses about data loading, database state, component internals, or implementation causes.
- Do not infer root causes. Report only visible differences and uncertainty.
- If the two pages have similar content but differ in composition, describe the composition differences rather than saying the content is wrong.
- Use severity "high" for prominent mismatches that would fail visual parity, "medium" for noticeable but localized differences, and "low" for minor differences or uncertainty.
- If the candidate matches the reference, return an empty issues array.
- Confidence must reflect visual certainty, not task importance.
- Do not claim exact pixel measurements unless they are visually obvious.`;
  }

  private formatExpectations(expectations: string[] | undefined, fallback: string[]): string {
    const items = expectations?.length ? expectations : fallback;
    return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
  }

  private parseVisionResponse(response: string):
    | { success: true; data: VisionAnalysis }
    | { success: false; error: unknown } {
    try {
      const json = extractJsonObject(response);
      return { success: true, data: visionSchema.parse(JSON.parse(json)) };
    } catch (error) {
      return { success: false, error };
    }
  }

  private fallbackFromUnstructuredResponse(
    response: string,
    assumeMismatch: boolean
  ): VisionAnalysis | null {
    const normalized = response.replace(/\s+/g, " ").trim();
    if (!normalized) return null;

    return {
      matches_expectations: !assumeMismatch,
      confidence: 0.45,
      issues: [
        {
          type: "unstructured_visual_response",
          description: normalized.slice(0, 900),
          severity: assumeMismatch ? "medium" : "low"
        }
      ]
    };
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
