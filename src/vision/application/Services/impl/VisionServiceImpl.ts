import { inject, injectable } from "tsyringe";
import { SHARED_TOKENS } from "../../../../shared/tokens.js";
import { VISION_TOKENS } from "../../../tokens.js";
import type { IImageProcessorService } from "../../../../shared/application/Services/IImageProcessorService.js";
import type { ProviderSelection } from "../../../../shared/application/models/ProviderSelection.js";
import type { ToolResult } from "../../../../shared/application/models/ToolResult.js";
import type { VisionAnalysis } from "../../../domain/models/VisionModels.js";
import { parseVisionResponse } from "../../Mappers/visionModel.mapper.js";
import type { AnalyzeImageInput, CompareImagesInput } from "../../DTOs/vision.dto.js";
import type { IVisionService } from "../vision.service.js";

@injectable()
export class VisionServiceImpl implements IVisionService {
  constructor(
    @inject(VISION_TOKENS.VisionModelConfig) private readonly config: ProviderSelection,
    @inject(SHARED_TOKENS.ImageProcessor) private readonly imageProcessor: IImageProcessorService
  ) {}

  async analyzeImage(input: AnalyzeImageInput): Promise<ToolResult<VisionAnalysis>> {
    try {
      const image = await this.imageProcessor.imageToOptimizedBase64(input.imagePath);
      const prompt = this.buildPrompt(input, false);
      const first = await this.generate({ prompt, image });
      if (first.success) return first.data;

      const firstFallback = this.fallbackFromUnstructuredResponse(first.response, false);
      if (firstFallback) return firstFallback;

      const retry = await this.generate({ prompt: this.buildPrompt(input, true, first.response), image });
      const retryParsed = retry;
      if (retryParsed.success) return retryParsed.data;

      const fallback = this.fallbackFromUnstructuredResponse(retry.response || first.response, false);
      if (fallback) return fallback;

      return {
        error: true,
        message: "Vision model returned malformed JSON after retry.",
        details: { firstResponse: first.response, retryResponse: retry.response, parseError: retryParsed.error }
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
      const comparisonImage = await this.imageProcessor.comparisonContactSheetBase64(
        input.referenceImagePath,
        input.candidateImagePath
      );
      const prompt = this.buildComparePrompt(input, false);
      const first = await this.generate({ prompt, image: comparisonImage });
      if (first.success) return first.data;

      const firstFallback = this.fallbackFromUnstructuredResponse(first.response, true);
      if (firstFallback) return firstFallback;

      const retry = await this.generate({ prompt: this.buildComparePrompt(input, true, first.response), image: comparisonImage });
      const retryParsed = retry;
      if (retryParsed.success) return retryParsed.data;

      const fallback = this.fallbackFromUnstructuredResponse(retry.response || first.response, true);
      if (fallback) return fallback;

      return {
        error: true,
        message: "Vision model returned malformed JSON after retry.",
        details: { firstResponse: first.response, retryResponse: retry.response, parseError: retryParsed.error }
      };
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown image comparison error.",
        details: error
      };
    }
  }

  private async generate(input: { prompt: string; image: string }): Promise<
    { success: true; data: VisionAnalysis; response: string } | { success: false; error: unknown; response: string }
  > {
    const { content } = await this.config.client.generate({
      model: this.config.model,
      prompt: input.prompt,
      images: [input.image],
      format: this.config.provider === "ollama" ? "json" : undefined,
      options: { temperature: 0, num_predict: 700, maxTokens: 700 }
    });
    const parsed = parseVisionResponse(content);
    return parsed.success
      ? { success: true, data: parsed.data, response: content }
      : { success: false, error: parsed.error, response: content };
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

  private fallbackFromUnstructuredResponse(
    response: string,
    assumeMismatch: boolean
  ): VisionAnalysis | null {
    const normalized = response.replace(/\s+/g, " ").trim();
    if (!normalized) return null;

    return {
      matchesExpectations: !assumeMismatch,
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
