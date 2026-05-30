#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ExecuteService } from "./executeService.js";
import { OllamaClient } from "./ollamaClient.js";
import { OcrService } from "./ocrService.js";
import { PlaywrightService } from "./playwrightService.js";
import { VisionService } from "./visionService.js";

const executeSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
  env: z.record(z.string()).optional(),
  shell: z.boolean().optional()
});

const screenshotSchema = z.object({
  url: z.string().optional(),
  selector: z.string().optional(),
  full_page: z.boolean().optional(),
  output_path: z.string().optional(),
  delay_ms: z.number().int().nonnegative().max(120_000).optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
    .optional()
});

const browserNavigateSchema = z.object({
  url: z.string().min(1),
  wait_until: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
    .optional()
});

const browserSnapshotSchema = z.object({
  selector: z.string().optional(),
  max_elements: z.number().int().positive().max(500).optional()
});

const browserClickSchema = z.object({ selector: z.string().min(1) });
const browserFillSchema = z.object({ selector: z.string().min(1), value: z.string() });
const browserPressKeySchema = z.object({ key: z.string().min(1), selector: z.string().optional() });
const browserWaitForSchema = z.object({
  selector: z.string().optional(),
  timeout_ms: z.number().int().positive().optional(),
  state: z.enum(["attached", "detached", "visible", "hidden"]).optional()
});
const browserEvaluateSchema = z.object({ script: z.string().min(1) });

const analyzeSchema = z.object({
  goal: z.string().min(1),
  expectations: z.array(z.string()).default([]),
  image_path: z.string().min(1)
});

const compareImagesSchema = z.object({
  goal: z.string().min(1),
  expectations: z.array(z.string()).default([]),
  reference_image_path: z.string().min(1),
  candidate_image_path: z.string().min(1)
});

const extractTextSchema = z.object({
  image_path: z.string().min(1)
});

const ollama = new OllamaClient();
const executeService = new ExecuteService();
const playwrightService = new PlaywrightService();
const visionService = new VisionService(ollama);
const ocrService = new OcrService(ollama);

const server = new Server(
  {
    name: "browserlens",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "execute_code",
      description: "Execute a local command or script and return stdout/stderr. Supports Playwright scripts through the local Node runtime.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string" },
          args: { type: "array", items: { type: "string" } },
          cwd: { type: "string" },
          timeout_ms: { type: "number" },
          env: { type: "object", additionalProperties: { type: "string" } },
          shell: { type: "boolean" }
        },
        required: ["command"]
      }
    },
    {
      name: "browser_navigate",
      description: "Navigate the persistent Playwright page to a URL. Returns text/JSON only, never image content.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          wait_until: { type: "string", enum: ["load", "domcontentloaded", "networkidle"] },
          viewport: {
            type: "object",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            },
            required: ["width", "height"]
          }
        },
        required: ["url"]
      }
    },
    {
      name: "browser_snapshot",
      description: "Read the active page as structured text/DOM metadata for non-vision models. Use this for navigation, selectors, forms, and page state. Do not use it as a substitute for visual comparison because DOM/text can match while rendered layout differs.",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string" },
          max_elements: { type: "number" }
        }
      }
    },
    {
      name: "browser_click",
      description: "Click a selector on the active Playwright page. Returns JSON only.",
      inputSchema: {
        type: "object",
        properties: { selector: { type: "string" } },
        required: ["selector"]
      }
    },
    {
      name: "browser_fill",
      description: "Fill an input-like selector on the active Playwright page. Returns JSON only.",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string" },
          value: { type: "string" }
        },
        required: ["selector", "value"]
      }
    },
    {
      name: "browser_press_key",
      description: "Press a keyboard key on the active page or on a selector. Returns JSON only.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
          selector: { type: "string" }
        },
        required: ["key"]
      }
    },
    {
      name: "browser_wait_for",
      description: "Wait for a selector state, or wait timeout_ms when no selector is supplied. Returns JSON only.",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string" },
          timeout_ms: { type: "number" },
          state: { type: "string", enum: ["attached", "detached", "visible", "hidden"] }
        }
      }
    },
    {
      name: "browser_evaluate",
      description: "Evaluate JavaScript on the active page and return JSON-serializable data. Intended for bounded DOM inspection.",
      inputSchema: {
        type: "object",
        properties: { script: { type: "string" } },
        required: ["script"]
      }
    },
    {
      name: "capture_screenshot",
      description: "Capture a screenshot with Playwright from the active page or a URL/selector and store it locally. Returns only JSON metadata such as image_path, dimensions, and blank_like; never image bytes. Use delay_ms when a canvas, iframe, animation, or client-rendered content needs extra time after navigation or selector visibility before capture. If blank_like is true, the capture is probably not useful for visual comparison and should be recaptured from the rendered canvas/content, often with delay_ms. For visual understanding, pass image_path to analyze_image, compare_images, or extract_text.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          selector: { type: "string" },
          full_page: { type: "boolean" },
          output_path: { type: "string" },
          delay_ms: {
            type: "number",
            description: "Milliseconds to wait immediately before taking the screenshot. Use this for delayed canvas/iframe/client rendering, for example 2000-5000."
          },
          viewport: {
            type: "object",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            },
            required: ["width", "height"]
          }
        }
      }
    },
    {
      name: "analyze_image",
      description: "Interpret one screenshot using the configured multimodal Ollama model and return strict textual JSON for text-only models. Use after capture_screenshot when you need to understand what is visually rendered. expectations is optional.",
      inputSchema: {
        type: "object",
        properties: {
          goal: { type: "string" },
          expectations: { type: "array", items: { type: "string" } },
          image_path: { type: "string" }
        },
        required: ["goal", "image_path"]
      }
    },
    {
      name: "compare_images",
      description: "Compare two screenshots visually using the configured multimodal Ollama model and return strict textual JSON for text-only models. Use this for visual parity: first capture the reference page, then capture the candidate page, then call compare_images with reference_image_path and candidate_image_path. Pass expectations that define what matters and what should be tolerated, such as same photo with different crop/scale should be reported as crop/scale, not a different identity. Do not rely on browser_snapshot/DOM when rendered composition matters. Do not infer database/code causes from the image result. A result with matches_expectations:false is a successful comparison that found visual differences, not a tool failure. Only error:true means the tool failed. expectations is optional but strongly recommended.",
      inputSchema: {
        type: "object",
        properties: {
          goal: { type: "string" },
          expectations: { type: "array", items: { type: "string" } },
          reference_image_path: { type: "string" },
          candidate_image_path: { type: "string" }
        },
        required: ["goal", "reference_image_path", "candidate_image_path"]
      }
    },
    {
      name: "extract_text",
      description: "Extract visible text from an image using deepseek-ocr via Ollama.",
      inputSchema: {
        type: "object",
        properties: {
          image_path: { type: "string" }
        },
        required: ["image_path"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  try {
    const { name, arguments: args } = request.params;
    switch (name) {
      case "execute_code":
        return json(await executeService.execute(executeSchema.parse(args)));
      case "browser_navigate":
        return json(await playwrightService.navigate(browserNavigateSchema.parse(args)));
      case "browser_snapshot":
        return json(await playwrightService.snapshot(browserSnapshotSchema.parse(args)));
      case "browser_click":
        return json(await playwrightService.click(browserClickSchema.parse(args)));
      case "browser_fill":
        return json(await playwrightService.fill(browserFillSchema.parse(args)));
      case "browser_press_key":
        return json(await playwrightService.pressKey(browserPressKeySchema.parse(args)));
      case "browser_wait_for":
        return json(await playwrightService.waitFor(browserWaitForSchema.parse(args)));
      case "browser_evaluate":
        return json(await playwrightService.evaluate(browserEvaluateSchema.parse(args)));
      case "capture_screenshot":
        return json(await playwrightService.captureScreenshot(screenshotSchema.parse(args)));
      case "analyze_image":
        return json(await visionService.analyzeImage(analyzeSchema.parse(args)));
      case "compare_images":
        return json(await visionService.compareImages(compareImagesSchema.parse(args)));
      case "extract_text":
        return json(await ocrService.extractText(extractTextSchema.parse(args)));
      default:
        return json({ error: true, message: `Unknown tool: ${name}` }, true);
    }
  } catch (error) {
    return json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Unknown MCP tool error.",
        details: error
      },
      true
    );
  }
});

function json(value: unknown, isError = false): CallToolResult {
  return {
    isError,
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

process.on("SIGINT", async () => {
  await shutdown();
});

process.on("SIGTERM", async () => {
  await shutdown();
});

async function shutdown(): Promise<void> {
  await playwrightService.close();
  await ollama.unload();
  process.exit(0);
}

const transport = new StdioServerTransport();
await server.connect(transport);
