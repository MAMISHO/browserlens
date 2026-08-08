import type { IModelClientService, ProviderKind } from "../application/Services/IModelClientService.js";
import type { ProviderSelection } from "../application/models/ProviderSelection.js";

export function isEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.toLowerCase() ?? "");
}

export type { ProviderKind };

export function selectedProvider(kind: "vision" | "ocr"): ProviderKind {
  const explicit = process.env[`${kind.toUpperCase()}_PROVIDER`]?.trim().toLowerCase();
  if (explicit === "openai" || explicit === "custom" || explicit === "ollama") {
    return explicit;
  }
  if (kind === "vision" && isEnabled(process.env.USE_CUSTOM_VISION)) {
    return "custom";
  }
  if (kind === "ocr" && isEnabled(process.env.USE_CUSTOM_OCR)) {
    return "custom";
  }

  return "ollama";
}

export function createVisionProvider(client: IModelClientService): ProviderSelection {
  const provider = selectedProvider("vision");
  if (provider === "openai") {
    return {
      provider,
      client,
      model: process.env.VISION_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o"
    };
  }

  if (provider === "custom") {
    return {
      provider,
      client,
      model: process.env.VISION_CUSTOM_MODEL ?? process.env.CUSTOM_PROVIDER_MODEL ?? "gpt-4o"
    };
  }

  return {
    provider,
    client,
    model: process.env.VISION_MODEL ?? "qwen3-vl:8b"
  };
}

export function createOcrProvider(client: IModelClientService): ProviderSelection {
  const provider = selectedProvider("ocr");
  if (provider === "openai") {
    return {
      provider,
      client,
      model: process.env.OCR_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o"
    };
  }

  if (provider === "custom") {
    return {
      provider,
      client,
      model:
        process.env.OCR_CUSTOM_MODEL ??
        process.env.CUSTOM_PROVIDER_MODEL ??
        process.env.OCR_MODEL ??
        "gpt-4o"
    };
  }

  return {
    provider,
    client,
    model: process.env.OCR_MODEL ?? "deepseek-ocr"
  };
}
