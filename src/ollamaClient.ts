import { setTimeout as sleep } from "node:timers/promises";

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  images?: string[];
  format?: "json";
  options?: Record<string, unknown>;
}

export interface OllamaClientOptions {
  baseUrl?: string;
  keepAlive?: string;
  requestTimeoutMs?: number;
}

interface OllamaGenerateResponse {
  response?: string;
  done?: boolean;
  error?: string;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
    thinking?: string;
  };
  error?: string;
}

export class OllamaClient {
  private readonly baseUrl: string;
  private readonly keepAlive: string;
  private readonly requestTimeoutMs: number;
  private activeModel: string | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: OllamaClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.keepAlive = options.keepAlive ?? "0";
    this.requestTimeoutMs = options.requestTimeoutMs ?? 120_000;
  }

  async generate(request: OllamaGenerateRequest): Promise<string> {
    return this.runExclusive(async () => {
      await this.switchModel(request.model);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

      try {
        if (request.images?.length) {
          return await this.chatWithImages(request, controller);
        }

        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            ...request,
            stream: false,
            keep_alive: this.keepAlive
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama generate failed: ${response.status} ${await response.text()}`);
        }

        const data = (await response.json()) as OllamaGenerateResponse;
        if (data.error) {
          throw new Error(data.error);
        }
        return data.response ?? "";
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  private async chatWithImages(request: OllamaGenerateRequest, controller: AbortController): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: request.model,
        messages: [
          {
            role: "user",
            content: request.prompt,
            images: request.images
          }
        ],
        stream: false,
        format: request.format,
        options: request.options,
        keep_alive: this.keepAlive
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama chat failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    if (data.error) {
      throw new Error(data.error);
    }
    return data.message?.content || data.message?.thinking || "";
  }

  async unload(model?: string): Promise<void> {
    const modelToUnload = model ?? this.activeModel;
    if (!modelToUnload) return;

    await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: modelToUnload,
        prompt: "",
        stream: false,
        keep_alive: 0
      })
    }).catch(() => undefined);

    if (this.activeModel === modelToUnload) {
      this.activeModel = null;
    }
  }

  private async switchModel(model: string): Promise<void> {
    if (this.activeModel && this.activeModel !== model) {
      await this.unload(this.activeModel);
      await sleep(150);
    }
    this.activeModel = model;
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}
