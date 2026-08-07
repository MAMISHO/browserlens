export interface GenerateRequest {
  model: string;
  prompt: string;
  images?: string[];
  format?: "json";
  options?: Record<string, unknown>;
}

export interface ModelClient {
  generate(request: GenerateRequest): Promise<string>;
}

export function isEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.toLowerCase() ?? "");
}

export type ProviderKind = "ollama" | "openai" | "custom";

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
