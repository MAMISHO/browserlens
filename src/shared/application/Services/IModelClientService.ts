export interface GenerateRequest {
  model: string;
  prompt: string;
  images?: string[];
  format?: "json";
  options?: Record<string, unknown>;
}

export type ProviderKind = "ollama" | "openai" | "custom";

export interface IModelClientService {
  generate(req: GenerateRequest): Promise<{ content: string }>;
  unload?(): Promise<void>;
}
