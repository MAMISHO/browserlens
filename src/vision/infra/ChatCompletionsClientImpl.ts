import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions.js";
import type { IModelClientService, GenerateRequest } from "../../shared/application/Services/IModelClientService.js";

export interface ChatCompletionsClientOptions {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  label?: string;
  maxTokens?: number;
}

export class ChatCompletionsClientImpl implements IModelClientService {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly defaultModel: string;
  private readonly label: string;
  private readonly maxTokens: number;

  constructor(options: ChatCompletionsClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.defaultModel = options.defaultModel ?? "gpt-4o";
    this.label = options.label ?? "Chat Completions API";
    this.maxTokens = options.maxTokens ?? 700;
  }

  async generate(request: GenerateRequest): Promise<{ content: string }> {
    const client = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: this.apiKey ?? "not-needed"
    });

    const content: ChatCompletionContentPart[] = [];
    for (const image of request.images ?? []) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${image}` }
      });
    }
    content.push({ type: "text", text: request.prompt });

    try {
      const result = await client.chat.completions.create({
        model: request.model || this.defaultModel,
        messages: [{ role: "user", content }],
        temperature: typeof request.options?.temperature === "number" ? request.options.temperature : 0,
        max_tokens:
          typeof request.options?.maxTokens === "number"
            ? request.options.maxTokens
            : typeof request.options?.num_predict === "number"
              ? request.options.num_predict
              : this.maxTokens,
        response_format: request.format === "json" ? { type: "json_object" } : undefined
      });

      return { content: result.choices[0]?.message?.content ?? "" };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`${this.label} failed: ${error.message}`);
      }
      throw error;
    }
  }
}
