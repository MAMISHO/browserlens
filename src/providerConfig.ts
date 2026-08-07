import { OllamaClient } from "./ollamaClient.js";
import { ChatCompletionsClient } from "./chatCompletionsClient.js";
import { selectedProvider, type ModelClient, type ProviderKind } from "./modelClient.js";

export interface ProviderSelection {
  client: ModelClient;
  model: string;
  provider: ProviderKind;
}

export function createVisionProvider(ollama: OllamaClient): ProviderSelection {
  const provider = selectedProvider("vision");
  if (provider === "openai") {
    return {
      provider,
      client: new ChatCompletionsClient({
        baseUrl: process.env.VISION_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL,
        apiKey: process.env.VISION_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
        defaultModel: process.env.VISION_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o",
        label: "Vision OpenAI API"
      }),
      model: process.env.VISION_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o"
    };
  }

  if (provider === "custom") {
    return {
      provider,
      client: new ChatCompletionsClient({
        baseUrl: process.env.VISION_CUSTOM_BASE_URL ?? process.env.CUSTOM_PROVIDER_BASE_URL,
        apiKey: process.env.VISION_CUSTOM_API_KEY ?? process.env.CUSTOM_PROVIDER_API_KEY,
        defaultModel: process.env.VISION_CUSTOM_MODEL ?? process.env.CUSTOM_PROVIDER_MODEL ?? "gpt-4o",
        label: "Vision custom provider"
      }),
      model: process.env.VISION_CUSTOM_MODEL ?? process.env.CUSTOM_PROVIDER_MODEL ?? "gpt-4o"
    };
  }

  return {
    provider,
    client: ollama,
    model: process.env.VISION_MODEL ?? "qwen3-vl:8b"
  };
}

export function createOcrProvider(ollama: OllamaClient): ProviderSelection {
  const provider = selectedProvider("ocr");
  if (provider === "openai") {
    return {
      provider,
      client: new ChatCompletionsClient({
        baseUrl: process.env.OCR_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL,
        apiKey: process.env.OCR_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
        defaultModel: process.env.OCR_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o",
        label: "OCR OpenAI API"
      }),
      model: process.env.OCR_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o"
    };
  }

  if (provider === "custom") {
    return {
      provider,
      client: new ChatCompletionsClient({
        baseUrl: process.env.OCR_CUSTOM_BASE_URL ?? process.env.CUSTOM_PROVIDER_BASE_URL,
        apiKey: process.env.OCR_CUSTOM_API_KEY ?? process.env.CUSTOM_PROVIDER_API_KEY,
        defaultModel:
          process.env.OCR_CUSTOM_MODEL ??
          process.env.CUSTOM_PROVIDER_MODEL ??
          process.env.OCR_MODEL ??
          "gpt-4o",
        label: "OCR custom provider"
      }),
      model:
        process.env.OCR_CUSTOM_MODEL ??
        process.env.CUSTOM_PROVIDER_MODEL ??
        process.env.OCR_MODEL ??
        "gpt-4o"
    };
  }

  return {
    provider,
    client: ollama,
    model: process.env.OCR_MODEL ?? "deepseek-ocr"
  };
}
